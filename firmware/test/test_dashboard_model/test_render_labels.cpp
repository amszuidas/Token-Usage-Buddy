#include <unity.h>

#include "render_labels.h"

void test_freshness_label_distinguishes_current_and_stale_data() {
  TEST_ASSERT_EQUAL_STRING("Current", token_buddy::freshnessLabel(false));
  TEST_ASSERT_EQUAL_STRING("Stale", token_buddy::freshnessLabel(true));
}
