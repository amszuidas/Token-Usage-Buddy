#include <unity.h>

#include "render_palette.h"

void test_today_value_colors_swap_token_and_cost_emphasis() {
  TEST_ASSERT_EQUAL_UINT16(token_buddy::kColorAccent, token_buddy::todayTokenValueColor());
  TEST_ASSERT_EQUAL_UINT16(token_buddy::kColorText, token_buddy::todayCostValueColor());
}

void test_breakdown_colors_follow_semantic_roles() {
  TEST_ASSERT_EQUAL_UINT16(0x3C1E, token_buddy::breakdownColor(0));
  TEST_ASSERT_EQUAL_UINT16(0xFD24, token_buddy::breakdownColor(1));
  TEST_ASSERT_EQUAL_UINT16(0xA3DE, token_buddy::breakdownColor(2));
  TEST_ASSERT_EQUAL_UINT16(0x264B, token_buddy::breakdownColor(3));
}
