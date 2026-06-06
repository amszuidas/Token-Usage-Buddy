#pragma once
#ifndef UNIT_TEST

#include <M5Unified.h>
#include <stdio.h>
#include <string.h>

#include "dashboard_model.h"
#include "render_icons.h"
#include "render_metrics.h"

namespace token_buddy {
namespace render {

constexpr int32_t kWidth = 320;
constexpr int32_t kHeight = 240;
constexpr int32_t kTopBarHeight = 30;
constexpr uint16_t kBg = 0x0841;
constexpr uint16_t kPanel = 0x18E3;
constexpr uint16_t kText = 0xFFFF;
constexpr uint16_t kMuted = 0xA514;
constexpr uint16_t kLine = 0x39E7;
constexpr uint16_t kAccent = 0x05FF;
constexpr uint16_t kGood = 0x07E0;
constexpr uint16_t kWarn = 0xFDC0;
constexpr uint16_t kBad = 0xF800;
constexpr uint16_t kOverlay = 0x0000;

inline uint16_t nonZeroColor(uint16_t color, uint16_t fallback) {
  return color == 0 ? fallback : color;
}

inline const char* viewTitle(View view) {
  switch (view) {
    case View::Today:
      return "Today";
    case View::Agents:
      return "Agents";
    case View::Trend:
      return "7-day Trend";
    case View::Breakdown:
      return "Breakdown";
    case View::Status:
      return "Status";
  }
  return "";
}

inline void text(M5GFX& gfx, int32_t x, int32_t y, const char* value, uint16_t color = kText,
                 uint8_t size = 1) {
  gfx.setTextColor(color, kBg);
  gfx.setTextSize(size);
  gfx.setCursor(x, y);
  gfx.print(value);
}

inline void clippedText(M5GFX& gfx, int32_t x, int32_t y, const char* value, size_t maxChars,
                        uint16_t color = kText, uint8_t size = 1) {
  char buffer[32] = {};
  const size_t len = strlen(value);
  if (len <= maxChars || maxChars < 4) {
    snprintf(buffer, sizeof(buffer), "%.*s", static_cast<int>(maxChars), value);
  } else {
    snprintf(buffer, sizeof(buffer), "%.*s...", static_cast<int>(maxChars - 3), value);
  }
  text(gfx, x, y, buffer, color, size);
}

inline void drawBluetoothIcon(M5GFX& gfx, int32_t x, int32_t y, uint16_t color) {
  const IconSegments icon = bluetoothIconSegments(x, y);
  for (uint8_t i = 0; i < icon.count; ++i) {
    const IconLine& line = icon.lines[i];
    gfx.drawLine(line.x1, line.y1, line.x2, line.y2, color);
    gfx.drawLine(line.x1 + 1, line.y1, line.x2 + 1, line.y2, color);
  }
}

inline void drawTopBar(M5GFX& gfx, const DashboardModel& model) {
  const DashboardData& data = model.data();
  gfx.fillRect(0, 0, kWidth, kTopBarHeight, 0x0000);
  gfx.setTextColor(kText, 0x0000);
  gfx.setTextSize(2);
  gfx.setCursor(8, 6);
  gfx.print(viewTitle(model.currentView()));

  const uint16_t btColor = data.bleConnected ? kGood : kMuted;
  drawBluetoothIcon(gfx, 270, 15, btColor);

  gfx.drawRect(290, 9, 22, 12, kText);
  gfx.fillRect(312, 12, 3, 6, kText);
  gfx.fillRect(293, 12, 15, 6, data.stale ? kWarn : kGood);
}

inline void drawProgressBar(M5GFX& gfx, int32_t x, int32_t y, int32_t width, int32_t height,
                            float percent, uint16_t color) {
  if (percent < 0.0f) {
    percent = 0.0f;
  }
  if (percent > 100.0f) {
    percent = 100.0f;
  }
  gfx.drawRect(x, y, width, height, kLine);
  const int32_t fillWidth = static_cast<int32_t>((width - 2) * (percent / 100.0f));
  if (fillWidth > 0) {
    gfx.fillRect(x + 1, y + 1, fillWidth, height - 2, color);
  }
}

inline void drawToday(M5GFX& gfx, const DashboardData& data) {
  text(gfx, 16, 42, "TOKENS TODAY", kMuted, 2);
  clippedText(gfx, 16, 68, data.todayTotal, 9, kText, 5);
  text(gfx, 18, 126, "COST", kMuted, 2);
  clippedText(gfx, 84, 126, data.cost, 12, kAccent, 3);

  gfx.drawLine(16, 164, 304, 164, kLine);
  text(gfx, 18, 180, "Updated", kMuted, 2);
  clippedText(gfx, 120, 180, data.updatedAt[0] ? data.updatedAt : "Waiting", 15, kText, 2);
  if (data.stale) {
    text(gfx, 18, 210, "Stale", kWarn, 2);
  }
}

inline void drawAgents(M5GFX& gfx, const DashboardData& data) {
  for (size_t i = 0; i < 4; ++i) {
    const AgentRow& row = data.agents[i];
    const int32_t y = 42 + static_cast<int32_t>(i) * 46;
    const uint16_t color = nonZeroColor(row.color565, kAccent);
    clippedText(gfx, 16, y, row.label[0] ? row.label : "-", 12, kText, 2);
    clippedText(gfx, 214, y, row.value[0] ? row.value : "0", 8, kMuted, 2);
    drawProgressBar(gfx, 16, y + 26, 288, 16, row.percent, color);
  }
}

inline void drawTrend(M5GFX& gfx, const DashboardData& data) {
  text(gfx, 16, 42, "LAST 7 DAYS", kMuted, 2);

  uint64_t maxTotal = 1;
  for (size_t i = 0; i < 7; ++i) {
    if (data.sevenDayTotals[i] > maxTotal) {
      maxTotal = data.sevenDayTotals[i];
    }
  }

  constexpr int32_t baseY = 196;
  constexpr int32_t maxBarHeight = 118;
  for (size_t i = 0; i < 7; ++i) {
    const int32_t x = 18 + static_cast<int32_t>(i) * 43;
    const int32_t barHeight = trendBarHeight(data.sevenDayTotals[i], maxTotal, maxBarHeight);
    gfx.fillRect(x, baseY - barHeight, 26, barHeight, kAccent);
    gfx.drawRect(x, baseY - maxBarHeight, 26, maxBarHeight, kLine);
    char label[4] = {};
    snprintf(label, sizeof(label), "%u", static_cast<unsigned>(i + 1));
    text(gfx, x + 8, 210, label, kMuted, 2);
  }
}

inline void drawBreakdown(M5GFX& gfx, const DashboardData& data) {
  static const char* labels[4] = {"Input", "Cache Cr", "Cache Rd", "Output"};
  static const uint16_t colors[4] = {0x07FF, 0xFD20, 0x7BEF, 0xC618};

  uint64_t total = 0;
  for (size_t i = 0; i < 4; ++i) {
    total += data.breakdown[i];
  }
  if (total == 0) {
    text(gfx, 56, 112, "No breakdown yet", kMuted, 2);
    return;
  }

  for (size_t i = 0; i < 4; ++i) {
    const int32_t y = 42 + static_cast<int32_t>(i) * 44;
    const float percent =
        static_cast<float>((static_cast<double>(data.breakdown[i]) * 100.0) / static_cast<double>(total));
    text(gfx, 16, y, labels[i], kText, 2);
    char value[12] = {};
    formatTokenLabel(data.breakdown[i], value, sizeof(value));
    clippedText(gfx, 214, y, value, 8, kMuted, 2);
    drawProgressBar(gfx, 16, y + 26, 288, 14, percent, colors[i]);
  }
}

inline void drawStatus(M5GFX& gfx, const DashboardData& data) {
  text(gfx, 18, 44, "Bluetooth", kMuted, 2);
  text(gfx, 144, 44, data.bleConnected ? "Connected" : "Waiting", data.bleConnected ? kGood : kWarn, 2);
  text(gfx, 18, 80, "ccusage", kMuted, 2);
  clippedText(gfx, 144, 80, data.ccusageVersion[0] ? data.ccusageVersion : "Unknown", 13, kText, 2);
  text(gfx, 18, 116, "Next", kMuted, 2);
  clippedText(gfx, 144, 116, data.nextRefresh[0] ? data.nextRefresh : "-", 13, kText, 2);
  text(gfx, 18, 152, "State", kMuted, 2);
  text(gfx, 144, 152, data.stale ? "Stale" : "Current", data.stale ? kWarn : kGood, 2);
  if (data.error[0]) {
    text(gfx, 18, 190, "Error", kBad, 2);
    clippedText(gfx, 18, 214, data.error, 30, kText, 1);
  }
}

inline void drawRefreshOverlay(M5GFX& gfx) {
  gfx.fillRect(30, 64, 260, 118, kOverlay);
  gfx.drawRect(30, 64, 260, 118, kAccent);
  text(gfx, 86, 88, "Updating", kText, 3);
  text(gfx, 52, 126, "Running ccusage...", kMuted, 2);
}

}  // namespace render

inline void renderDashboard(M5GFX& gfx, const DashboardModel& model) {
  gfx.fillScreen(render::kBg);
  render::drawTopBar(gfx, model);

  switch (model.currentView()) {
    case View::Today:
      render::drawToday(gfx, model.data());
      break;
    case View::Agents:
      render::drawAgents(gfx, model.data());
      break;
    case View::Trend:
      render::drawTrend(gfx, model.data());
      break;
    case View::Breakdown:
      render::drawBreakdown(gfx, model.data());
      break;
    case View::Status:
      render::drawStatus(gfx, model.data());
      break;
  }

  if (model.isRefreshing()) {
    render::drawRefreshOverlay(gfx);
  }
}

}  // namespace token_buddy

#endif  // UNIT_TEST
