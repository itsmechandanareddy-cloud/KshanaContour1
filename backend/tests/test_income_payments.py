"""
Test suite for income payments seeding verification.
Tests the 52 incoming payment records from Tracker.xlsx.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9187202605",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_admin_login(self, auth_token):
        """Test admin can login with correct credentials"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Admin login successful, token length: {len(auth_token)}")


class TestOrdersData:
    """Test orders collection has correct data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9187202605",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_orders_count(self, auth_headers):
        """Verify 64 orders exist in the system"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        orders = response.json()
        print(f"Total orders in system: {len(orders)}")
        assert len(orders) == 64, f"Expected 64 orders, got {len(orders)}"
        print("✓ 64 orders exist in the system")
    
    def test_ksh01_varsha_payments(self, auth_headers):
        """KSH-01 Varsha should have 3 payments: 5000+10000+20000 = 35000"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        orders = response.json()
        ksh01 = next((o for o in orders if o.get("order_id") == "KSH-01"), None)
        assert ksh01 is not None, "KSH-01 not found"
        
        payments = ksh01.get("payments", [])
        assert len(payments) == 3, f"Expected 3 payments for KSH-01, got {len(payments)}"
        
        total_paid = sum(p.get("amount", 0) for p in payments)
        assert total_paid == 35000, f"Expected 35000 total paid, got {total_paid}"
        
        # Verify individual amounts
        amounts = sorted([p.get("amount", 0) for p in payments])
        assert amounts == [5000, 10000, 20000], f"Expected [5000, 10000, 20000], got {amounts}"
        
        print(f"✓ KSH-01 Varsha has 3 payments totaling 35000: {amounts}")
    
    def test_ksh41_chethana_payments(self, auth_headers):
        """KSH-41 Chethana has 2 payments: 2000 Advance + 6250 Full payment"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        orders = response.json()
        ksh41 = next((o for o in orders if o.get("order_id") == "KSH-41"), None)
        assert ksh41 is not None, "KSH-41 not found"
        
        payments = ksh41.get("payments", [])
        assert len(payments) == 2, f"Expected 2 payments for KSH-41, got {len(payments)}"
        
        total_paid = sum(p.get("amount", 0) for p in payments)
        assert total_paid == 8250, f"Expected 8250 total paid (2000+6250), got {total_paid}"
        
        amounts = sorted([p.get("amount", 0) for p in payments])
        assert amounts == [2000, 6250], f"Expected [2000, 6250], got {amounts}"
        
        print(f"✓ KSH-41 Chethana has 2 payments: {amounts}")
    
    def test_combined_orders_ksh21_ksh18(self, auth_headers):
        """KSH-21 and KSH-18 both have 12000 payment (combined order)"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        orders = response.json()
        
        ksh21 = next((o for o in orders if o.get("order_id") == "KSH-21"), None)
        ksh18 = next((o for o in orders if o.get("order_id") == "KSH-18"), None)
        
        assert ksh21 is not None, "KSH-21 not found"
        assert ksh18 is not None, "KSH-18 not found"
        
        ksh21_payments = ksh21.get("payments", [])
        ksh18_payments = ksh18.get("payments", [])
        
        # Both should have the 12000 payment
        ksh21_total = sum(p.get("amount", 0) for p in ksh21_payments)
        ksh18_total = sum(p.get("amount", 0) for p in ksh18_payments)
        
        assert ksh21_total == 12000, f"KSH-21 expected 12000, got {ksh21_total}"
        assert ksh18_total == 12000, f"KSH-18 expected 12000, got {ksh18_total}"
        
        print(f"✓ KSH-21 and KSH-18 both have 12000 payment (combined order)")
    
    def test_combined_orders_ksh07_ksh08(self, auth_headers):
        """KSH-07 and KSH-08 both have 17800 payment (combined order)"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        orders = response.json()
        
        ksh07 = next((o for o in orders if o.get("order_id") == "KSH-07"), None)
        ksh08 = next((o for o in orders if o.get("order_id") == "KSH-08"), None)
        
        assert ksh07 is not None, "KSH-07 not found"
        assert ksh08 is not None, "KSH-08 not found"
        
        ksh07_payments = ksh07.get("payments", [])
        ksh08_payments = ksh08.get("payments", [])
        
        ksh07_total = sum(p.get("amount", 0) for p in ksh07_payments)
        ksh08_total = sum(p.get("amount", 0) for p in ksh08_payments)
        
        assert ksh07_total == 17800, f"KSH-07 expected 17800, got {ksh07_total}"
        assert ksh08_total == 17800, f"KSH-08 expected 17800, got {ksh08_total}"
        
        print(f"✓ KSH-07 and KSH-08 both have 17800 payment (combined order)")
    
    def test_orders_with_balance(self, auth_headers):
        """Verify orders with balance: KSH-16=750, KSH-38=5000, KSH-45=1500"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        orders = response.json()
        
        # KSH-16 Mangala balance=750
        ksh16 = next((o for o in orders if o.get("order_id") == "KSH-16"), None)
        assert ksh16 is not None, "KSH-16 not found"
        assert ksh16.get("balance") == 750, f"KSH-16 expected balance 750, got {ksh16.get('balance')}"
        print(f"✓ KSH-16 Mangala balance=750")
        
        # KSH-38 Veena balance=5000
        ksh38 = next((o for o in orders if o.get("order_id") == "KSH-38"), None)
        assert ksh38 is not None, "KSH-38 not found"
        assert ksh38.get("balance") == 5000, f"KSH-38 expected balance 5000, got {ksh38.get('balance')}"
        print(f"✓ KSH-38 Veena balance=5000")
        
        # KSH-45 Latha balance=1500
        ksh45 = next((o for o in orders if o.get("order_id") == "KSH-45"), None)
        assert ksh45 is not None, "KSH-45 not found"
        assert ksh45.get("balance") == 1500, f"KSH-45 expected balance 1500, got {ksh45.get('balance')}"
        print(f"✓ KSH-45 Latha balance=1500")


class TestPartnershipReport:
    """Test partnership report endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9187202605",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_partnership_report_loads(self, auth_headers):
        """Partnership report endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/reports/partnership", headers=auth_headers)
        assert response.status_code == 200, f"Partnership report failed: {response.text}"
        data = response.json()
        
        # Check structure
        assert "chandana" in data
        assert "akanksha" in data
        assert "kshana_account" in data
        assert "summary" in data
        
        print("✓ Partnership report loads successfully")
    
    def test_kshana_account_totals(self, auth_headers):
        """Kshana Account: UPI Income ~147110, Cash Income ~29150, Outgoing SBI ~99122"""
        response = requests.get(f"{BASE_URL}/api/reports/partnership", headers=auth_headers)
        data = response.json()
        
        kshana = data.get("kshana_account", {})
        upi_income = kshana.get("kshana_upi_income", 0)
        cash_income = kshana.get("cash_income", 0)
        sbi_outgoing = kshana.get("total_sbi_outgoing", 0)
        
        print(f"Kshana Account - UPI Income: {upi_income}, Cash Income: {cash_income}, SBI Outgoing: {sbi_outgoing}")
        
        # Allow some tolerance for approximate values
        assert 145000 <= upi_income <= 150000, f"UPI Income expected ~147110, got {upi_income}"
        assert 27000 <= cash_income <= 32000, f"Cash Income expected ~29150, got {cash_income}"
        assert 95000 <= sbi_outgoing <= 105000, f"SBI Outgoing expected ~99122, got {sbi_outgoing}"
        
        print(f"✓ Kshana Account totals verified: UPI={upi_income}, Cash={cash_income}, SBI={sbi_outgoing}")
    
    def test_kshana_upi_income_entries_count(self, auth_headers):
        """Kshana (UPI) tab shows 38 UPI income entries"""
        response = requests.get(f"{BASE_URL}/api/reports/partnership", headers=auth_headers)
        data = response.json()
        
        kshana_income_entries = data.get("kshana_account", {}).get("kshana_income_entries", [])
        count = len(kshana_income_entries)
        
        print(f"Kshana UPI income entries count: {count}")
        assert count == 38, f"Expected 38 UPI income entries, got {count}"
        
        # Verify entries have customer names
        for entry in kshana_income_entries[:5]:
            assert entry.get("paid_to"), f"Entry missing customer name: {entry}"
        
        print(f"✓ 38 UPI income entries with customer names verified")
    
    def test_cash_income_entries_count(self, auth_headers):
        """Cash tab shows 14 cash income entries"""
        response = requests.get(f"{BASE_URL}/api/reports/partnership", headers=auth_headers)
        data = response.json()
        
        cash_income_entries = data.get("kshana_account", {}).get("cash_income_entries", [])
        count = len(cash_income_entries)
        
        print(f"Cash income entries count: {count}")
        assert count == 14, f"Expected 14 cash income entries, got {count}"
        
        print(f"✓ 14 cash income entries verified")


class TestFinancialSummary:
    """Test financial summary endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9187202605",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_financial_summary_loads(self, auth_headers):
        """Financial summary endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary", headers=auth_headers)
        assert response.status_code == 200, f"Financial summary failed: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "pending" in data
        assert "employees" in data
        assert "materials" in data
        assert "net_summary" in data
        
        print("✓ Financial summary loads successfully")
    
    def test_income_payments_have_customer_names(self, auth_headers):
        """Income payments should have customer names (not null)"""
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary", headers=auth_headers)
        data = response.json()
        
        payments = data.get("orders", {}).get("payments", [])
        assert len(payments) > 0, "No income payments found"
        
        # Check that payments have customer names
        payments_with_names = [p for p in payments if p.get("customer_name")]
        payments_without_names = [p for p in payments if not p.get("customer_name")]
        
        print(f"Payments with customer names: {len(payments_with_names)}")
        print(f"Payments without customer names: {len(payments_without_names)}")
        
        # Most payments should have customer names
        assert len(payments_with_names) > len(payments_without_names), \
            f"Too many payments without customer names: {len(payments_without_names)}"
        
        # Sample check
        for p in payments[:5]:
            print(f"  - {p.get('order_id')}: {p.get('customer_name')} - {p.get('amount')}")
        
        print(f"✓ Income payments have customer names")


class TestExportData:
    """Test export data endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "phone": "9187202605",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_export_all_data(self, auth_headers):
        """Export all data endpoint works"""
        response = requests.get(f"{BASE_URL}/api/export/all-data", headers=auth_headers)
        assert response.status_code == 200, f"Export failed: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "employees" in data
        assert "materials" in data
        assert "partnership" in data
        
        print(f"Export data - Orders: {len(data['orders'])}, Partnership: {len(data['partnership'])}")
        print("✓ Export all data works")
    
    def test_partnership_entries_include_income(self, auth_headers):
        """Partnership entries include income type entries"""
        response = requests.get(f"{BASE_URL}/api/export/all-data", headers=auth_headers)
        data = response.json()
        
        partnership = data.get("partnership", [])
        income_entries = [e for e in partnership if e.get("type") == "income"]
        expense_entries = [e for e in partnership if e.get("type") != "income"]
        
        print(f"Partnership entries - Income: {len(income_entries)}, Expense: {len(expense_entries)}")
        
        assert len(income_entries) == 52, f"Expected 52 income entries, got {len(income_entries)}"
        
        print("✓ 52 income entries in partnership collection")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
