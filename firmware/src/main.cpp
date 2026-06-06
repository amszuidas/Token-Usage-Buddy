#include <Arduino.h>
#include <M5Unified.h>

#include "ble_peripheral.h"
#include "dashboard_model.h"
#include "dashboard_render.h"
#include "touch_nav.h"

namespace {

token_buddy::DashboardModel model;
token_buddy::BlePeripheral ble;
bool lastBleConnected = false;

void render() {
  token_buddy::renderDashboard(M5.Display, model);
}

void updateBleConnectionState() {
  const bool connected = ble.connected();
  if (connected == lastBleConnected &&
      model.data().bleConnected == connected) {
    return;
  }

  model.mutableData().bleConnected = connected;
  lastBleConnected = connected;
  render();
}

void handleCompletedPayload() {
  if (!ble.hasPayload()) {
    return;
  }

  (void)ble.payload();
  model.setRefreshing(false);
  model.mutableData().bleConnected = true;
  model.mutableData().stale = false;
  model.mutableData().error[0] = '\0';
  lastBleConnected = true;
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
      model.setRefreshing(true);
      ble.sendRefreshEvent();
      render();
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
