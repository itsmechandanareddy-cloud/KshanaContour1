"""
Test Reviews and Gallery Features
- Reviews CRUD endpoints
- Reviews stats endpoint
- Gallery delete functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReviewsAPI:
    """Test Reviews CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9876543210",
            "password": "admin123"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed - skipping authenticated tests")
    
    def test_get_reviews_public(self):
        """GET /api/reviews - should return reviews list (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/reviews returned {len(data)} reviews")
        
        # Check review structure if any exist
        if len(data) > 0:
            review = data[0]
            assert "id" in review
            assert "reviewer_name" in review
            assert "rating" in review
            assert "review_text" in review
            print(f"✓ Review structure valid: {review.get('reviewer_name')}")
    
    def test_get_reviews_stats_public(self):
        """GET /api/reviews/stats - should return rating stats (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/reviews/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "average" in data
        assert "distribution" in data
        assert isinstance(data["distribution"], dict)
        
        # Check distribution has all 5 star ratings
        for star in [1, 2, 3, 4, 5]:
            assert str(star) in data["distribution"] or star in data["distribution"]
        
        print(f"✓ GET /api/reviews/stats: total={data['total']}, average={data['average']}")
        print(f"  Distribution: {data['distribution']}")
    
    def test_create_review_admin_only(self):
        """POST /api/reviews - should create review (admin only)"""
        review_data = {
            "reviewer_name": "TEST_Review_User",
            "rating": 5,
            "review_text": "Excellent service! The blouse was perfectly tailored.",
            "date": "2026-01-15",
            "source": "google"
        }
        
        response = self.session.post(f"{BASE_URL}/api/reviews", json=review_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data.get("message") == "Review added"
        
        self.created_review_id = data["id"]
        print(f"✓ POST /api/reviews created review with id: {data['id']}")
        
        # Verify review was created by fetching all reviews
        get_resp = requests.get(f"{BASE_URL}/api/reviews")
        reviews = get_resp.json()
        created = next((r for r in reviews if r.get("id") == self.created_review_id), None)
        assert created is not None
        assert created["reviewer_name"] == "TEST_Review_User"
        assert created["rating"] == 5
        print(f"✓ Verified review persisted in database")
    
    def test_create_review_unauthorized(self):
        """POST /api/reviews without auth should fail"""
        review_data = {
            "reviewer_name": "Unauthorized User",
            "rating": 3,
            "review_text": "This should fail",
            "source": "direct"
        }
        
        response = requests.post(f"{BASE_URL}/api/reviews", json=review_data)
        assert response.status_code == 401
        print(f"✓ POST /api/reviews without auth correctly returns 401")
    
    def test_update_review(self):
        """PUT /api/reviews/{id} - should update review"""
        # First create a review
        create_resp = self.session.post(f"{BASE_URL}/api/reviews", json={
            "reviewer_name": "TEST_Update_User",
            "rating": 4,
            "review_text": "Good service",
            "source": "instagram"
        })
        assert create_resp.status_code == 200
        review_id = create_resp.json()["id"]
        
        # Update the review
        update_data = {
            "reviewer_name": "TEST_Update_User_Modified",
            "rating": 5,
            "review_text": "Excellent service! Updated review.",
            "source": "google"
        }
        
        update_resp = self.session.put(f"{BASE_URL}/api/reviews/{review_id}", json=update_data)
        assert update_resp.status_code == 200
        assert update_resp.json().get("message") == "Review updated"
        print(f"✓ PUT /api/reviews/{review_id} updated successfully")
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/reviews")
        reviews = get_resp.json()
        updated = next((r for r in reviews if r.get("id") == review_id), None)
        assert updated is not None
        assert updated["reviewer_name"] == "TEST_Update_User_Modified"
        assert updated["rating"] == 5
        print(f"✓ Verified review update persisted")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/reviews/{review_id}")
    
    def test_delete_review(self):
        """DELETE /api/reviews/{id} - should delete review"""
        # First create a review
        create_resp = self.session.post(f"{BASE_URL}/api/reviews", json={
            "reviewer_name": "TEST_Delete_User",
            "rating": 3,
            "review_text": "To be deleted",
            "source": "direct"
        })
        assert create_resp.status_code == 200
        review_id = create_resp.json()["id"]
        
        # Delete the review
        delete_resp = self.session.delete(f"{BASE_URL}/api/reviews/{review_id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("message") == "Review deleted"
        print(f"✓ DELETE /api/reviews/{review_id} successful")
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/reviews")
        reviews = get_resp.json()
        deleted = next((r for r in reviews if r.get("id") == review_id), None)
        assert deleted is None
        print(f"✓ Verified review was deleted from database")
    
    def test_delete_review_not_found(self):
        """DELETE /api/reviews/{id} with invalid id should return 404"""
        response = self.session.delete(f"{BASE_URL}/api/reviews/000000000000000000000000")
        assert response.status_code == 404
        print(f"✓ DELETE non-existent review correctly returns 404")


class TestGalleryAPI:
    """Test Gallery endpoints - specifically delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9876543210",
            "password": "admin123"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed - skipping authenticated tests")
    
    def test_get_gallery_public(self):
        """GET /api/gallery - should return gallery items (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/gallery")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/gallery returned {len(data)} items")
        
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "title" in item
            print(f"✓ Gallery item structure valid: {item.get('title')}")
    
    def test_delete_gallery_item(self):
        """DELETE /api/gallery/{id} - should delete gallery item"""
        # First create a gallery item via POST (not upload)
        create_resp = self.session.post(f"{BASE_URL}/api/gallery", json={
            "title": "TEST_Gallery_Item",
            "description": "Test item for deletion",
            "image_url": "https://example.com/test.jpg",
            "category": "test"
        })
        assert create_resp.status_code == 200
        item_id = create_resp.json()["id"]
        print(f"✓ Created test gallery item: {item_id}")
        
        # Delete the item
        delete_resp = self.session.delete(f"{BASE_URL}/api/gallery/{item_id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("message") == "Item deleted"
        print(f"✓ DELETE /api/gallery/{item_id} successful")
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/gallery")
        items = get_resp.json()
        deleted = next((i for i in items if i.get("id") == item_id), None)
        assert deleted is None
        print(f"✓ Verified gallery item was deleted")
    
    def test_delete_gallery_unauthorized(self):
        """DELETE /api/gallery/{id} without auth should fail"""
        # First get an existing gallery item
        get_resp = requests.get(f"{BASE_URL}/api/gallery")
        items = get_resp.json()
        
        if len(items) > 0:
            item_id = items[0]["id"]
            response = requests.delete(f"{BASE_URL}/api/gallery/{item_id}")
            assert response.status_code == 401
            print(f"✓ DELETE gallery without auth correctly returns 401")
        else:
            print("⚠ No gallery items to test unauthorized delete")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9876543210",
            "password": "admin123"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_cleanup_test_reviews(self):
        """Cleanup any TEST_ prefixed reviews"""
        get_resp = requests.get(f"{BASE_URL}/api/reviews")
        reviews = get_resp.json()
        
        test_reviews = [r for r in reviews if r.get("reviewer_name", "").startswith("TEST_")]
        for review in test_reviews:
            self.session.delete(f"{BASE_URL}/api/reviews/{review['id']}")
            print(f"  Cleaned up review: {review['reviewer_name']}")
        
        print(f"✓ Cleaned up {len(test_reviews)} test reviews")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
