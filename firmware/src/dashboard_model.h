#pragma once
#include <stdint.h>

namespace token_buddy {

enum class View : uint8_t {
  Today = 0,
  Agents = 1,
  Trend = 2,
  Breakdown = 3,
  Status = 4,
};

struct AgentRow {
  char label[12] = "";
  char value[12] = "";
  float percent = 0.0f;
  uint16_t color565 = 0;
};

struct DashboardData {
  char todayTotal[16] = "0";
  char cost[12] = "$0.00";
  char updatedAt[24] = "";
  char ccusageVersion[16] = "";
  char nextRefresh[16] = "";
  bool stale = true;
  bool bleConnected = false;
  char error[64] = "";
  AgentRow agents[4];
  uint32_t sevenDayTotals[7] = {0};
  uint32_t breakdown[4] = {0};
};

class DashboardModel {
public:
  View currentView() const { return view_; }
  bool isRefreshing() const { return refreshing_; }
  const DashboardData& data() const { return data_; }
  DashboardData& mutableData() { return data_; }

  void nextView() {
    view_ = static_cast<View>((static_cast<uint8_t>(view_) + 1) % 5);
  }

  void previousView() {
    view_ = static_cast<View>((static_cast<uint8_t>(view_) + 4) % 5);
  }

  void setRefreshing(bool refreshing) {
    refreshing_ = refreshing;
  }

private:
  View view_ = View::Today;
  bool refreshing_ = false;
  DashboardData data_;
};

}  // namespace token_buddy
