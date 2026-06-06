#include <cstdio>
#include <cstring>
#include <unity.h>

#include "dashboard_model.h"
#include "wire_protocol.h"

namespace {

uint16_t rgb565(uint8_t r, uint8_t g, uint8_t b) {
  return static_cast<uint16_t>(((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3));
}

void seedMetrics(token_buddy::DashboardData& data) {
  snprintf(data.todayTotal, sizeof(data.todayTotal), "existing");
  snprintf(data.cost, sizeof(data.cost), "$9.99");
  data.breakdown[0] = 1;
  data.breakdown[1] = 2;
  data.breakdown[2] = 3;
  data.breakdown[3] = 4;
  for (size_t i = 0; i < 7; ++i) {
    data.sevenDayTotals[i] = static_cast<uint32_t>(100 + i);
  }
  snprintf(data.agents[0].label, sizeof(data.agents[0].label), "Existing");
  snprintf(data.agents[0].value, sizeof(data.agents[0].value), "101");
  data.agents[0].percent = 12.0f;
  data.agents[0].color565 = 0x1234;
}

void test_full_dashboard_json_maps_display_data() {
  token_buddy::DashboardData data;
  data.bleConnected = true;

  const char* json = R"json({
    "schemaVersion": 1,
    "generatedAt": "2026-06-06T09:10:11.000Z",
    "timezone": "Asia/Shanghai",
    "ccusageVersion": "15.2.1",
    "stale": false,
    "refreshInProgress": false,
    "error": null,
    "nextRefreshAt": "2026-06-06T09:25:11.000Z",
    "today": {
      "date": "2026-06-06",
      "totalTokens": 1234567,
      "totalTokensLabel": "1.23M",
      "costUsd": 12.34,
      "costLabel": "$12.34",
      "breakdown": {
        "input": 100,
        "cacheCreate": 200,
        "cacheRead": 300,
        "output": 400
      },
      "agents": [
        {"id":"claude","label":"Claude","totalTokens":1000000,"percent":70.5},
        {"id":"codex","label":"Codex","totalTokens":200000,"percent":14.25},
        {"id":"opencode","label":"OpenCode","totalTokens":15000,"percent":10},
        {"id":"others","label":"Others","totalTokens":1234,"percent":5.25}
      ]
    },
    "sevenDays": [
      {"date":"2026-05-31","label":"Sun","totalTokens":10},
      {"date":"2026-06-01","label":"Mon","totalTokens":20},
      {"date":"2026-06-02","label":"Tue","totalTokens":30},
      {"date":"2026-06-03","label":"Wed","totalTokens":40},
      {"date":"2026-06-04","label":"Thu","totalTokens":50},
      {"date":"2026-06-05","label":"Fri","totalTokens":60},
      {"date":"2026-06-06","label":"Sat","totalTokens":70}
    ]
  })json";

  const token_buddy::DashboardJsonParseResult result = token_buddy::parseDashboardJson(json, data);

  TEST_ASSERT_TRUE(result.ok);
  TEST_ASSERT_FALSE(result.refreshInProgress);
  TEST_ASSERT_EQUAL_STRING("1.23M", data.todayTotal);
  TEST_ASSERT_EQUAL_STRING("$12.34", data.cost);
  TEST_ASSERT_EQUAL_STRING("2026-06-06T09:10:11.000", data.updatedAt);
  TEST_ASSERT_EQUAL_STRING("2026-06-06T09:2", data.nextRefresh);
  TEST_ASSERT_EQUAL_STRING("15.2.1", data.ccusageVersion);
  TEST_ASSERT_FALSE(data.stale);
  TEST_ASSERT_EQUAL_STRING("", data.error);
  TEST_ASSERT_TRUE(data.bleConnected);
  TEST_ASSERT_EQUAL_UINT32(100, data.breakdown[0]);
  TEST_ASSERT_EQUAL_UINT32(200, data.breakdown[1]);
  TEST_ASSERT_EQUAL_UINT32(300, data.breakdown[2]);
  TEST_ASSERT_EQUAL_UINT32(400, data.breakdown[3]);
  for (size_t i = 0; i < 7; ++i) {
    TEST_ASSERT_EQUAL_UINT32(static_cast<uint32_t>((i + 1) * 10), data.sevenDayTotals[i]);
  }
  TEST_ASSERT_EQUAL_STRING("Claude", data.agents[0].label);
  TEST_ASSERT_EQUAL_STRING("1M", data.agents[0].value);
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 70.5f, data.agents[0].percent);
  TEST_ASSERT_EQUAL_UINT16(rgb565(0xD9, 0x77, 0x57), data.agents[0].color565);
  TEST_ASSERT_EQUAL_STRING("Codex", data.agents[1].label);
  TEST_ASSERT_EQUAL_STRING("200K", data.agents[1].value);
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 14.25f, data.agents[1].percent);
  TEST_ASSERT_EQUAL_UINT16(rgb565(0x10, 0xA3, 0x7F), data.agents[1].color565);
  TEST_ASSERT_EQUAL_STRING("OpenCode", data.agents[2].label);
  TEST_ASSERT_EQUAL_STRING("15K", data.agents[2].value);
  TEST_ASSERT_EQUAL_UINT16(rgb565(0x03, 0xB0, 0x00), data.agents[2].color565);
  TEST_ASSERT_EQUAL_STRING("Others", data.agents[3].label);
  TEST_ASSERT_EQUAL_STRING("1.2K", data.agents[3].value);
  TEST_ASSERT_EQUAL_UINT16(rgb565(0x8E, 0x8E, 0xA0), data.agents[3].color565);
}

void test_partial_refresh_progress_preserves_metrics_and_sets_status() {
  token_buddy::DashboardData data;
  seedMetrics(data);
  snprintf(data.error, sizeof(data.error), "old error");

  const char* json = R"json({
    "schemaVersion": 1,
    "generatedAt": "2026-06-06T10:00:00.000Z",
    "timezone": "Asia/Shanghai",
    "stale": true,
    "refreshInProgress": true,
    "error": "refresh failed",
    "nextRefreshAt": null
  })json";

  const token_buddy::DashboardJsonParseResult result = token_buddy::parseDashboardJson(json, data);

  TEST_ASSERT_TRUE(result.ok);
  TEST_ASSERT_TRUE(result.refreshInProgress);
  TEST_ASSERT_TRUE(data.stale);
  TEST_ASSERT_EQUAL_STRING("2026-06-06T10:00:00.000", data.updatedAt);
  TEST_ASSERT_EQUAL_STRING("", data.nextRefresh);
  TEST_ASSERT_EQUAL_STRING("refresh failed", data.error);
  TEST_ASSERT_EQUAL_STRING("existing", data.todayTotal);
  TEST_ASSERT_EQUAL_STRING("$9.99", data.cost);
  TEST_ASSERT_EQUAL_UINT32(1, data.breakdown[0]);
  TEST_ASSERT_EQUAL_UINT32(106, data.sevenDayTotals[6]);
  TEST_ASSERT_EQUAL_STRING("Existing", data.agents[0].label);
  TEST_ASSERT_EQUAL_STRING("101", data.agents[0].value);
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 12.0f, data.agents[0].percent);
  TEST_ASSERT_EQUAL_UINT16(0x1234, data.agents[0].color565);

  const token_buddy::DashboardJsonParseResult clearResult =
      token_buddy::parseDashboardJson("{\"schemaVersion\":1,\"refreshInProgress\":true}", data);
  TEST_ASSERT_TRUE(clearResult.ok);
  TEST_ASSERT_TRUE(clearResult.refreshInProgress);
  TEST_ASSERT_EQUAL_STRING("", data.error);
}

void test_invalid_json_fails_without_corrupting_data() {
  token_buddy::DashboardData data;
  seedMetrics(data);
  data.stale = false;

  const token_buddy::DashboardJsonParseResult result = token_buddy::parseDashboardJson("{nope", data);

  TEST_ASSERT_FALSE(result.ok);
  TEST_ASSERT_FALSE(result.refreshInProgress);
  TEST_ASSERT_EQUAL_STRING("existing", data.todayTotal);
  TEST_ASSERT_EQUAL_STRING("$9.99", data.cost);
  TEST_ASSERT_FALSE(data.stale);
  TEST_ASSERT_EQUAL_UINT32(106, data.sevenDayTotals[6]);
  TEST_ASSERT_EQUAL_STRING("Existing", data.agents[0].label);
}

void test_unsupported_schema_version_rejected() {
  token_buddy::DashboardData data;
  seedMetrics(data);

  const token_buddy::DashboardJsonParseResult result =
      token_buddy::parseDashboardJson("{\"schemaVersion\":2,\"refreshInProgress\":false}", data);

  TEST_ASSERT_FALSE(result.ok);
  TEST_ASSERT_FALSE(result.refreshInProgress);
  TEST_ASSERT_EQUAL_STRING("existing", data.todayTotal);
}

}  // namespace

void runDashboardJsonTests() {
  RUN_TEST(test_full_dashboard_json_maps_display_data);
  RUN_TEST(test_partial_refresh_progress_preserves_metrics_and_sets_status);
  RUN_TEST(test_invalid_json_fails_without_corrupting_data);
  RUN_TEST(test_unsupported_schema_version_rejected);
}
