#include <unity.h>

#include "ble_peripheral.h"

using namespace token_buddy;

void test_ble_contract_values_match_bridge_protocol() {
  TEST_ASSERT_EQUAL_STRING("TokenUsageBuddy", kBleDeviceName);
  TEST_ASSERT_EQUAL_STRING("8f720001-7a5f-4a9d-9b0f-6e2d3c4b5a10", kBleServiceUuid);
  TEST_ASSERT_EQUAL_STRING("8f720002-7a5f-4a9d-9b0f-6e2d3c4b5a10", kBleDashboardRxUuid);
  TEST_ASSERT_EQUAL_STRING("8f720003-7a5f-4a9d-9b0f-6e2d3c4b5a10", kBleEventTxUuid);
}

void test_refresh_event_payload_is_exact_json() {
  TEST_ASSERT_EQUAL_STRING("{\"ev\":\"refresh\"}", kRefreshEventJson);
}

int main(int argc, char** argv) {
  UNITY_BEGIN();
  RUN_TEST(test_ble_contract_values_match_bridge_protocol);
  RUN_TEST(test_refresh_event_payload_is_exact_json);
  return UNITY_END();
}
