#include <unity.h>

#include "render_metrics.h"

void test_large_trend_values_scale_without_uint32_overflow() {
  TEST_ASSERT_EQUAL_INT32(118, token_buddy::trendBarHeight(500000000UL, 500000000UL, 118));
  TEST_ASSERT_EQUAL_INT32(59, token_buddy::trendBarHeight(250000000UL, 500000000UL, 118));
}

void test_non_zero_trend_values_keep_a_visible_bar() {
  TEST_ASSERT_EQUAL_INT32(3, token_buddy::trendBarHeight(1UL, 500000000UL, 118));
  TEST_ASSERT_EQUAL_INT32(0, token_buddy::trendBarHeight(0UL, 500000000UL, 118));
}

void test_breakdown_values_use_engineering_units() {
  char value[12] = {};

  token_buddy::formatTokenLabel(123456789UL, value, sizeof(value));

  TEST_ASSERT_EQUAL_STRING("123.5M", value);
}
