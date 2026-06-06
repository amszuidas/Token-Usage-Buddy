#include <Arduino.h>
#include <M5Unified.h>

#include "ble_peripheral.h"
#include "dashboard_model.h"
#include "dashboard_render.h"
#include "touch_nav.h"
#include "wire_protocol.h"

namespace {

token_buddy::DashboardModel model;
token_buddy::BlePeripheral ble;
bool lastBleConnected = false;

void render() {
  token_buddy::renderDashboard(M5.Display, model);
}

void updateBleConnectionState() {
  const bool connected = ble.connected();
  const bool wasRefreshing = model.isRefreshing();
  if (connected == lastBleConnected &&
      model.data().bleConnected == connected &&
      (connected || !wasRefreshing)) {
    return;
  }

  model.mutableData().bleConnected = connected;
  if (!connected) {
    model.setRefreshing(false);
  }
  lastBleConnected = connected;
  render();
}

void handleCompletedPayload() {
  if (!ble.hasPayload()) {
    return;
  }

  token_buddy::DashboardData& data = model.mutableData();
  const token_buddy::DashboardJsonParseResult parsed =
      token_buddy::parseDashboardJson(ble.payload(), data);
  if (parsed.ok) {
    model.setRefreshing(parsed.refreshInProgress);
  } else {
    model.setRefreshing(false);
    snprintf(data.error, sizeof(data.error), "Invalid dashboard data");
  }
  data.bleConnected = ble.connected();
  ble.clearPayload();
  render();
}

void handleTouch() {
  const auto touch = M5.Touch.getDetail();
  if (!touch.wasClicked()) {
    return;
  }

  const token_buddy::TouchAction action = token_buddy::classifyTouch(touch.x, touch.y);
  switch (action) {
    case token_buddy::TouchAction::Previous:
      model.previousView();
      render();
      break;
    case token_buddy::TouchAction::Refresh:
      if (ble.sendRefreshEvent()) {
        model.setRefreshing(true);
        render();
      }
      break;
    case token_buddy::TouchAction::Next:
      model.nextView();
      render();
      break;
    case token_buddy::TouchAction::None:
      break;
  }
}

}  // namespace

void setup() {
  M5.begin();
  M5.Display.setRotation(1);
  M5.Display.setTextDatum(top_left);

  ble.begin();
  model.mutableData().bleConnected = ble.connected();
  lastBleConnected = ble.connected();
  render();
}

void loop() {
  M5.update();
  updateBleConnectionState();
  handleCompletedPayload();
  handleTouch();
  delay(16);
}
