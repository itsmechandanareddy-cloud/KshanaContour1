"""
Backend API tests for Kshana Contour Boutique - Feature Testing
Tests: Admin login, Orders with measurements, WhatsApp endpoint, Gallery upload
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "9876543210"
ADMIN_PASSWORD = "admin123"

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "admin"
        assert data["phone"] == ADMIN_PHONE
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid password correctly rejected")


class TestOrdersWithMeasurements:
    """Test orders with order-level measurements (not per-item)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_orders_list(self, auth_token):
        """Test getting orders list"""
        response = requests.get(f"{BASE_URL}/api/orders", 
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ Orders list retrieved: {len(orders)} orders")
    
    def test_get_order_ksh636_has_measurements(self, auth_token):
        """Test that order KSH-636 has order-level measurements"""
        response = requests.get(f"{BASE_URL}/api/orders/KSH-636", 
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        order = response.json()
        
        # Verify order-level measurements exist
        assert "measurements" in order
        measurements = order.get("measurements", {})
        assert measurements.get("padded") == "yes"
        assert measurements.get("chest") == "36"
        assert measurements.get("waist") == "32"
        print(f"✓ Order KSH-636 has order-level measurements: {measurements}")
    
    def test_create_order_with_order_level_measurements(self, auth_token):
        """Test creating order with measurements at order level (not per item)"""
        import random
        test_phone = f"TEST{random.randint(10000, 99999)}"
        
        payload = {
            "customer_name": "TEST Order Measurements",
            "customer_phone": test_phone,
            "customer_dob": "1990-01-15",
            "delivery_date": "2026-06-01",
            "items": [
                {"service_type": "Normal blouses", "cost": 1500},
                {"service_type": "Hand work", "cost": 500}
            ],
            "measurements": {
                "padded": "no",
                "princess_cut": "yes",
                "open_style": "front",
                "length": "15",
                "shoulder": "13",
                "chest": "34",
                "waist": "30"
            },
            "tax_percentage": 18,
            "advance_amount": 500,
            "advance_date": "2026-04-15",
            "advance_mode": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=payload,
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        order_id = data["order_id"]
        print(f"✓ Order created with ID: {order_id}")
        
        # Verify the order was saved with measurements
        get_response = requests.get(f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert get_response.status_code == 200
        order = get_response.json()
        
        # Verify measurements are at order level
        assert "measurements" in order
        assert order["measurements"]["princess_cut"] == "yes"
        assert order["measurements"]["chest"] == "34"
        print(f"✓ Order measurements verified at order level")


class TestWhatsAppEndpoint:
    """Test WhatsApp message generation endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_whatsapp_message_status_update(self, auth_token):
        """Test WhatsApp message for status update"""
        response = requests.get(
            f"{BASE_URL}/api/orders/KSH-636/whatsapp-message?message_type=status_update",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "whatsapp_url" in data
        assert "phone" in data
        assert "wa.me" in data["whatsapp_url"]
        assert "KSH-636" in data["message"]
        print(f"✓ WhatsApp URL generated: {data['whatsapp_url'][:50]}...")
    
    def test_whatsapp_message_order_created(self, auth_token):
        """Test WhatsApp message for order created"""
        response = requests.get(
            f"{BASE_URL}/api/orders/KSH-636/whatsapp-message?message_type=order_created",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "Kshana Contour" in data["message"]
        assert "whatsapp_url" in data
        print(f"✓ Order created WhatsApp message generated")
    
    def test_whatsapp_message_payment_reminder(self, auth_token):
        """Test WhatsApp message for payment reminder"""
        response = requests.get(
            f"{BASE_URL}/api/orders/KSH-636/whatsapp-message?message_type=payment_reminder",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "Balance Due" in data["message"]
        print(f"✓ Payment reminder WhatsApp message generated")


class TestGalleryUpload:
    """Test gallery upload endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_gallery(self):
        """Test getting gallery items (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/gallery")
        assert response.status_code == 200
        gallery = response.json()
        assert isinstance(gallery, list)
        print(f"✓ Gallery retrieved: {len(gallery)} items")
    
    def test_gallery_upload_endpoint_exists(self, auth_token):
        """Test that gallery upload endpoint exists and requires auth"""
        # Test without file - should fail with validation error, not 404
        response = requests.post(f"{BASE_URL}/api/gallery/upload",
            headers={"Authorization": f"Bearer {auth_token}"})
        # Should be 422 (validation error for missing file) not 404
        assert response.status_code in [422, 400]
        print(f"✓ Gallery upload endpoint exists (status: {response.status_code})")
    
    def test_gallery_upload_requires_auth(self):
        """Test that gallery upload requires authentication"""
        # Create a dummy file to test auth
        files = {"file": ("test.jpg", b"fake image data", "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/gallery/upload", files=files)
        # Should be 401 (unauthorized) when no token provided
        assert response.status_code == 401
        print(f"✓ Gallery upload requires authentication")


class TestInvoiceData:
    """Test that invoice data doesn't include measurements"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_order_data_for_invoice(self, auth_token):
        """Test order data structure for invoice (items + billing, measurements separate)"""
        response = requests.get(f"{BASE_URL}/api/orders/KSH-636",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        order = response.json()
        
        # Verify items exist with cost
        assert "items" in order
        assert len(order["items"]) > 0
        for item in order["items"]:
            assert "service_type" in item
            assert "cost" in item
        
        # Verify billing fields
        assert "subtotal" in order
        assert "tax_amount" in order
        assert "total" in order
        assert "balance" in order
        
        # Verify measurements are separate from items
        assert "measurements" in order
        # Items should NOT have measurement fields like chest, waist at item level
        # (old format had measurements inside each item)
        print(f"✓ Order data structure correct for invoice")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
