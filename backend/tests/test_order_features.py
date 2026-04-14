"""
Test suite for new order features:
1. Delete order with reason (archives to deleted_orders)
2. Upload reference images on orders
3. Front/back neck reference images per item
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "9876543210"
ADMIN_PASSWORD = "admin123"


class TestOrderDeleteWithReason:
    """Test DELETE /api/orders/{id} with reason field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_delete_order_requires_reason(self):
        """Test that delete endpoint requires a reason"""
        # First create a test order
        order_data = {
            "customer_name": "TEST Delete Reason",
            "customer_phone": "9999888877",
            "customer_dob": "1990-01-01",
            "delivery_date": "2026-02-15",
            "items": [{"service_type": "Normal blouses", "cost": 500}],
            "tax_percentage": 18,
            "advance_amount": 0
        }
        create_resp = self.session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert create_resp.status_code == 200, f"Create order failed: {create_resp.text}"
        order_id = create_resp.json().get("order_id")
        print(f"Created test order: {order_id}")
        
        # Try to delete without reason - should fail
        delete_resp = self.session.delete(f"{BASE_URL}/api/orders/{order_id}", json={})
        # Pydantic validation should fail
        assert delete_resp.status_code in [422, 400], f"Expected validation error, got {delete_resp.status_code}"
        print("Delete without reason correctly rejected")
        
        # Delete with reason - should succeed
        delete_resp = self.session.delete(f"{BASE_URL}/api/orders/{order_id}", json={
            "reason": "Test deletion - customer cancelled"
        })
        assert delete_resp.status_code == 200, f"Delete with reason failed: {delete_resp.text}"
        print(f"Order {order_id} deleted successfully with reason")
        
        # Verify order is gone
        get_resp = self.session.get(f"{BASE_URL}/api/orders/{order_id}")
        assert get_resp.status_code == 404, "Order should not exist after deletion"
        print("Verified order no longer exists")
    
    def test_delete_existing_order_ksh_580(self):
        """Test deleting order KSH-580 if it exists"""
        # Check if KSH-580 exists
        get_resp = self.session.get(f"{BASE_URL}/api/orders/KSH-580")
        if get_resp.status_code == 404:
            pytest.skip("KSH-580 does not exist")
        
        assert get_resp.status_code == 200
        print("Found order KSH-580")
        
        # Delete with reason
        delete_resp = self.session.delete(f"{BASE_URL}/api/orders/KSH-580", json={
            "reason": "Test deletion for verification"
        })
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print("KSH-580 deleted successfully")


class TestOrderImageUpload:
    """Test POST /api/orders/{id}/images upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_image_upload_endpoint_exists(self):
        """Test that image upload endpoint exists for order KSH-636"""
        # Check if KSH-636 exists
        get_resp = self.session.get(f"{BASE_URL}/api/orders/KSH-636")
        if get_resp.status_code == 404:
            pytest.skip("KSH-636 does not exist")
        
        assert get_resp.status_code == 200
        order = get_resp.json()
        print(f"Found order KSH-636: {order.get('customer_name')}")
        
        # Create a simple test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        # Upload image with multipart/form-data
        files = {'file': ('test_reference.png', io.BytesIO(png_data), 'image/png')}
        headers = {"Authorization": f"Bearer {self.token}"}  # Remove Content-Type for multipart
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/orders/KSH-636/images?image_type=reference",
            files=files,
            headers=headers
        )
        
        assert upload_resp.status_code == 200, f"Image upload failed: {upload_resp.text}"
        result = upload_resp.json()
        assert "id" in result, "Response should contain image id"
        assert result.get("image_type") == "reference"
        print(f"Image uploaded successfully: {result}")
    
    def test_front_neck_image_upload(self):
        """Test uploading front neck reference image"""
        get_resp = self.session.get(f"{BASE_URL}/api/orders/KSH-636")
        if get_resp.status_code == 404:
            pytest.skip("KSH-636 does not exist")
        
        # Create test image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('front_neck.png', io.BytesIO(png_data), 'image/png')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/orders/KSH-636/images?image_type=front_neck_0",
            files=files,
            headers=headers
        )
        
        assert upload_resp.status_code == 200, f"Front neck image upload failed: {upload_resp.text}"
        result = upload_resp.json()
        assert result.get("image_type") == "front_neck_0"
        print(f"Front neck image uploaded: {result}")
    
    def test_back_neck_image_upload(self):
        """Test uploading back neck reference image"""
        get_resp = self.session.get(f"{BASE_URL}/api/orders/KSH-636")
        if get_resp.status_code == 404:
            pytest.skip("KSH-636 does not exist")
        
        # Create test image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('back_neck.png', io.BytesIO(png_data), 'image/png')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/orders/KSH-636/images?image_type=back_neck_0",
            files=files,
            headers=headers
        )
        
        assert upload_resp.status_code == 200, f"Back neck image upload failed: {upload_resp.text}"
        result = upload_resp.json()
        assert result.get("image_type") == "back_neck_0"
        print(f"Back neck image uploaded: {result}")
    
    def test_get_order_images(self):
        """Test that order images are returned in order data"""
        get_resp = self.session.get(f"{BASE_URL}/api/orders/KSH-636")
        if get_resp.status_code == 404:
            pytest.skip("KSH-636 does not exist")
        
        order = get_resp.json()
        images = order.get("images", [])
        print(f"Order KSH-636 has {len(images)} images")
        
        for img in images:
            print(f"  - {img.get('image_type')}: {img.get('id')}")
        
        # Images array should exist (may be empty if no uploads yet)
        assert isinstance(images, list), "images should be a list"


class TestOrdersListWithDeleteButton:
    """Test that orders list has delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_orders_list_returns_data(self):
        """Test that orders list endpoint works"""
        resp = self.session.get(f"{BASE_URL}/api/orders")
        assert resp.status_code == 200
        orders = resp.json()
        assert isinstance(orders, list)
        print(f"Found {len(orders)} orders")
        
        # Print first few order IDs
        for order in orders[:5]:
            print(f"  - {order.get('order_id')}: {order.get('customer_name')}")
    
    def test_delete_endpoint_exists(self):
        """Test that DELETE endpoint exists and requires auth"""
        # Without auth should fail
        resp = requests.delete(f"{BASE_URL}/api/orders/FAKE-123", json={"reason": "test"})
        assert resp.status_code == 401, "Should require authentication"
        print("DELETE endpoint requires authentication - correct")
        
        # With auth but non-existent order should return 404
        resp = self.session.delete(f"{BASE_URL}/api/orders/FAKE-123", json={"reason": "test"})
        assert resp.status_code == 404, "Should return 404 for non-existent order"
        print("DELETE endpoint returns 404 for non-existent order - correct")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
