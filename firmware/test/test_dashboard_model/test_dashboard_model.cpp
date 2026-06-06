#include <unity.h>
#include "dashboard_model.h"

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
  return UNITY_END();
}
