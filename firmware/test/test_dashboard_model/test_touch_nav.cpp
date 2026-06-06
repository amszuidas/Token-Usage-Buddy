#include <unity.h>
#include "touch_nav.h"

void test_bottom_band_left_center_right_classification() {
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Previous, token_buddy::classifyTouch(0, 220));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Previous, token_buddy::classifyTouch(52, 220));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Refresh, token_buddy::classifyTouch(106, 220));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Refresh, token_buddy::classifyTouch(160, 220));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Next, token_buddy::classifyTouch(213, 220));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Next, token_buddy::classifyTouch(319, 220));
}

void test_touch_above_bottom_band_returns_none() {
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::None, token_buddy::classifyTouch(20, 199));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::None, token_buddy::classifyTouch(160, 199));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::None, token_buddy::classifyTouch(300, 199));
}

void test_boundary_behavior_around_thirds_and_activation_threshold() {
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::None, token_buddy::classifyTouch(105, 199));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Previous, token_buddy::classifyTouch(105, 200));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Refresh, token_buddy::classifyTouch(106, 200));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Refresh, token_buddy::classifyTouch(212, 200));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Next, token_buddy::classifyTouch(213, 200));
}

void test_core2_touch_buttons_map_to_actions() {
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Previous,
                    token_buddy::classifyButtonTouch(true, false, false));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Refresh,
                    token_buddy::classifyButtonTouch(false, true, false));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::Next,
                    token_buddy::classifyButtonTouch(false, false, true));
  TEST_ASSERT_EQUAL(token_buddy::TouchAction::None,
                    token_buddy::classifyButtonTouch(false, false, false));
}
