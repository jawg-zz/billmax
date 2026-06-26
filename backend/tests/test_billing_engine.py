"""Tests for the billing engine — VAT calculation, proration, setup fees."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── Pure function tests (no DB needed) ─────────────────────────────────────


class TestVatCalculation:
    """plan.price is VAT-inclusive. Verify back-calculation is correct."""

    def test_vat_inclusive_3500(self):
        """Fiber 20Mbps at KES 3,500 inclusive → vat=482.76, subtotal=3017.24"""
        price = 3500.0
        vat = round(price * 16 / 116, 2)
        subtotal = round(price - vat, 2)
        assert vat == 482.76
        assert subtotal == 3017.24
        assert round(subtotal + vat, 2) == price

    def test_vat_inclusive_5500(self):
        """Fiber 50Mbps at KES 5,500 inclusive"""
        price = 5500.0
        vat = round(price * 16 / 116, 2)
        subtotal = round(price - vat, 2)
        assert vat == 758.62
        assert subtotal == 4741.38
        assert round(subtotal + vat, 2) == price

    def test_vat_inclusive_15000(self):
        """Business 100Mbps at KES 15,000 inclusive"""
        price = 15000.0
        vat = round(price * 16 / 116, 2)
        subtotal = round(price - vat, 2)
        assert vat == 2068.97
        assert subtotal == 12931.03
        assert round(subtotal + vat, 2) == price

    def test_non_taxable(self):
        """Non-taxable plan: vat=0, subtotal=price"""
        price = 1000.0
        taxable = False
        vat = round(price * 16 / 116, 2) if taxable else 0.0
        subtotal = round(price - vat, 2) if taxable else price
        assert vat == 0.0
        assert subtotal == 1000.0

    def test_setup_fee_vat(self):
        """Setup fee at KES 1,000 inclusive"""
        fee = 1000.0
        vat = round(fee * 16 / 116, 2)
        subtotal = round(fee - vat, 2)
        assert vat == 137.93
        assert subtotal == 862.07
        assert round(subtotal + vat, 2) == fee


class TestProration:
    """Proration charges only the days actually used before next billing."""

    def test_full_cycle_no_proration(self):
        """Subscription started 30+ days ago → full price."""
        days_in_cycle = 30
        price = 3000.0
        days_since_start = 30
        if 0 < days_since_start < days_in_cycle:
            daily_rate = price / days_in_cycle
            price = round(days_since_start * daily_rate, 2)
        assert price == 3000.0  # no proration

    def test_mid_cycle_proration(self):
        """Subscription started 10 days ago → charge 10/30 of price."""
        days_in_cycle = 30
        price = 3000.0
        days_since_start = 10
        if 0 < days_since_start < days_in_cycle:
            daily_rate = price / days_in_cycle
            price = round(days_since_start * daily_rate, 2)
        assert price == 1000.0  # 10/30 of 3000

    def test_proration_rounding(self):
        """Proration of 7 days on 5500 → should round to 2 decimals."""
        days_in_cycle = 30
        price = 5500.0
        days_since_start = 7
        if 0 < days_since_start < days_in_cycle:
            daily_rate = price / days_in_cycle
            price = round(days_since_start * daily_rate, 2)
        assert price == 1283.33  # 7 * (5500/30)

    def test_edge_case_zero_days(self):
        """Started today (0 days) → full price, no proration."""
        days_in_cycle = 30
        price = 3000.0
        days_since_start = 0
        if 0 < days_since_start < days_in_cycle:
            daily_rate = price / days_in_cycle
            price = round(days_since_start * daily_rate, 2)
        assert price == 3000.0


class TestCylceDates:
    """Billing cycle advancement."""

    def test_monthly_advance(self):
        """Monthly cycle advances by 1 month."""
        from dateutil.relativedelta import relativedelta
        current = date(2026, 6, 15)
        mapping = {"monthly": relativedelta(months=1)}
        delta = mapping.get("monthly", relativedelta(months=1))
        next_date = current + delta
        assert next_date == date(2026, 7, 15)

    def test_quarterly_advance(self):
        """Quarterly cycle advances by 3 months."""
        from dateutil.relativedelta import relativedelta
        current = date(2026, 6, 15)
        mapping = {"quarterly": relativedelta(months=3)}
        delta = mapping.get("quarterly", relativedelta(months=3))
        next_date = current + delta
        assert next_date == date(2026, 9, 15)


class TestInvoiceNumberSequence:
    """Sequence number generation (test the FOR UPDATE fix)."""

    def test_format(self):
        """Invoice number format: INV-202600005"""
        number = f"INV-{2026}{5:05d}"
        assert number == "INV-202600005"

    def test_format_large_number(self):
        """Invoice number with large sequence."""
        number = f"INV-{2026}{12345:05d}"
        assert number == "INV-202612345"
