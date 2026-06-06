#include <unity.h>
#include "dashboard_model.h"

void test_bottom_band_left_center_right_classification();
void test_touch_above_bottom_band_returns_none();
void test_boundary_behavior_around_thirds_and_activation_threshold();
void test_core2_touch_buttons_map_to_actions();
void test_large_trend_values_scale_without_uint32_overflow();
void test_non_zero_trend_values_keep_a_visible_bar();
void test_breakdown_values_use_engineering_units();
void test_bluetooth_icon_uses_standard_rune_segments();
void test_freshness_label_distinguishes_current_and_stale_data();

void test_view_navigation_wraps() {
  token_buddy::DashboardModel model;
  TEST_ASSERT_EQUAL(token_buddy::View::Today, model.currentView());
  model.nextView();
  TEST_ASSERT_EQUAL(token_buddy::View::Agents, model.currentView());
  model.previousView();
  TEST_ASSERT_EQUAL(token_buddy::View::Today, model.currentView());
  model.previousView();
  TEST_ASSERT_EQUAL(token_buddy::View::Status, model.currentView());
}

void test_refresh_flag() {
  token_buddy::DashboardModel model;
  TEST_ASSERT_FALSE(model.isRefreshing());
  model.setRefreshing(true);
  TEST_ASSERT_TRUE(model.isRefreshing());
  model.setRefreshing(false);
  TEST_ASSERT_FALSE(model.isRefreshing());
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_view_navigation_wraps);
  RUN_TEST(test_refresh_flag);
  RUN_TEST(test_bottom_band_left_center_right_classification);
  RUN_TEST(test_touch_above_bottom_band_returns_none);
  RUN_TEST(test_boundary_behavior_around_thirds_and_activation_threshold);
  RUN_TEST(test_core2_touch_buttons_map_to_actions);
  RUN_TEST(test_large_trend_values_scale_without_uint32_overflow);
  RUN_TEST(test_non_zero_trend_values_keep_a_visible_bar);
  RUN_TEST(test_breakdown_values_use_engineering_units);
  RUN_TEST(test_bluetooth_icon_uses_standard_rune_segments);
  RUN_TEST(test_freshness_label_distinguishes_current_and_stale_data);
  return UNITY_END();
}
