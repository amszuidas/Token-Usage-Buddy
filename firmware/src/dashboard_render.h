#pragma once
#ifndef UNIT_TEST

#include <M5Unified.h>
#include <stdio.h>
#include <string.h>

#include "dashboard_model.h"

namespace token_buddy {
namespace render {

constexpr int32_t kWidth = 320;
constexpr int32_t kHeight = 240;
constexpr int32_t kTopBarHeight = 24;
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

inline void drawTopBar(M5GFX& gfx, const DashboardModel& model) {
  const DashboardData& data = model.data();
  gfx.fillRect(0, 0, kWidth, kTopBarHeight, 0x0000);
  gfx.setTextColor(kText, 0x0000);
  gfx.setTextSize(1);
  gfx.setCursor(8, 7);
  gfx.print(viewTitle(model.currentView()));

  const uint16_t btColor = data.bleConnected ? kGood : kMuted;
  gfx.setTextColor(btColor, 0x0000);
  gfx.setCursor(246, 7);
  gfx.print("BT");
  gfx.drawCircle(270, 12, 6, btColor);
  gfx.drawLine(270, 6, 270, 18, btColor);
  gfx.drawLine(270, 6, 276, 12, btColor);
  gfx.drawLine(270, 18, 276, 12, btColor);
  gfx.drawLine(270, 6, 264, 12, btColor);
  gfx.drawLine(270, 18, 264, 12, btColor);

  gfx.drawRect(288, 7, 24, 12, kText);
  gfx.fillRect(312, 10, 3, 6, kText);
  gfx.fillRect(291, 10, 16, 6, data.stale ? kWarn : kGood);
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
  text(gfx, 16, 38, "Tokens", kMuted, 1);
  clippedText(gfx, 16, 56, data.todayTotal, 9, kText, 3);
  text(gfx, 18, 96, "Cost", kMuted, 1);
  clippedText(gfx, 18, 112, data.cost, 11, kAccent, 2);

  gfx.drawLine(16, 144, 304, 144, kLine);
  text(gfx, 18, 158, "Updated", kMuted, 1);
  clippedText(gfx, 78, 158, data.updatedAt[0] ? data.updatedAt : "Waiting for data", 28, kText, 1);
  if (data.stale) {
    text(gfx, 18, 180, "Stale", kWarn, 1);
  }
}

inline void drawAgents(M5GFX& gfx, const DashboardData& data) {
  for (size_t i = 0; i < 4; ++i) {
    const AgentRow& row = data.agents[i];
    const int32_t y = 38 + static_cast<int32_t>(i) * 42;
    const uint16_t color = nonZeroColor(row.color565, kAccent);
    clippedText(gfx, 16, y, row.label[0] ? row.label : "-", 12, kText, 1);
    clippedText(gfx, 212, y, row.value[0] ? row.value : "0", 10, kMuted, 1);
    drawProgressBar(gfx, 16, y + 18, 284, 14, row.percent, color);
  }
}

inline void drawTrend(M5GFX& gfx, const DashboardData& data) {
  uint32_t maxTotal = 1;
  for (size_t i = 0; i < 7; ++i) {
    if (data.sevenDayTotals[i] > maxTotal) {
      maxTotal = data.sevenDayTotals[i];
    }
  }

  constexpr int32_t baseY = 190;
  constexpr int32_t maxBarHeight = 118;
  for (size_t i = 0; i < 7; ++i) {
    const int32_t x = 20 + static_cast<int32_t>(i) * 43;
    const int32_t barHeight = static_cast<int32_t>((data.sevenDayTotals[i] * maxBarHeight) / maxTotal);
    gfx.fillRect(x, baseY - barHeight, 24, barHeight, kAccent);
    gfx.drawRect(x, baseY - maxBarHeight, 24, maxBarHeight, kLine);
    char label[4] = {};
    snprintf(label, sizeof(label), "%u", static_cast<unsigned>(i + 1));
    text(gfx, x + 8, 202, label, kMuted, 1);
  }
}

inline void drawBreakdown(M5GFX& gfx, const DashboardData& data) {
  static const char* labels[4] = {"Input", "Output", "Cache", "Other"};
  static const uint16_t colors[4] = {0x07FF, 0xFD20, 0x7BEF, 0xC618};

  uint32_t total = 0;
  for (size_t i = 0; i < 4; ++i) {
    total += data.breakdown[i];
  }
  if (total == 0) {
    text(gfx, 86, 112, "No breakdown yet", kMuted, 1);
    return;
  }

  for (size_t i = 0; i < 4; ++i) {
    const int32_t y = 42 + static_cast<int32_t>(i) * 40;
    const float percent = (static_cast<float>(data.breakdown[i]) * 100.0f) / static_cast<float>(total);
    text(gfx, 16, y, labels[i], kText, 1);
    char value[18] = {};
    snprintf(value, sizeof(value), "%lu", static_cast<unsigned long>(data.breakdown[i]));
    clippedText(gfx, 214, y, value, 10, kMuted, 1);
    drawProgressBar(gfx, 16, y + 17, 284, 12, percent, colors[i]);
  }
}

inline void drawStatus(M5GFX& gfx, const DashboardData& data) {
  text(gfx, 18, 42, "Bluetooth", kMuted, 1);
  text(gfx, 112, 42, data.bleConnected ? "Connected" : "Waiting", data.bleConnected ? kGood : kWarn, 1);
  text(gfx, 18, 70, "ccusage", kMuted, 1);
  clippedText(gfx, 112, 70, data.ccusageVersion[0] ? data.ccusageVersion : "Unknown", 18, kText, 1);
  text(gfx, 18, 98, "Next", kMuted, 1);
  clippedText(gfx, 112, 98, data.nextRefresh[0] ? data.nextRefresh : "-", 18, kText, 1);
  text(gfx, 18, 126, "State", kMuted, 1);
  text(gfx, 112, 126, data.stale ? "Stale" : "Current", data.stale ? kWarn : kGood, 1);
  if (data.error[0]) {
    text(gfx, 18, 158, "Error", kBad, 1);
    clippedText(gfx, 18, 176, data.error, 30, kText, 1);
  }
}

inline void drawRefreshOverlay(M5GFX& gfx) {
  gfx.fillRect(34, 76, 252, 84, kOverlay);
  gfx.drawRect(34, 76, 252, 84, kAccent);
  text(gfx, 86, 98, "Updating", kText, 2);
  text(gfx, 78, 128, "Running ccusage...", kMuted, 1);
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
