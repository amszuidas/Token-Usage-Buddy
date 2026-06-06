#pragma once

#include <stddef.h>
#include <stdint.h>

#include "wire_protocol.h"

#ifndef UNIT_TEST
#include <NimBLEDevice.h>
#endif

namespace token_buddy {

constexpr const char* kBleDeviceName = "TokenUsageBuddy";
constexpr const char* kBleServiceUuid = "8f720001-7a5f-4a9d-9b0f-6e2d3c4b5a10";
constexpr const char* kBleDashboardRxUuid = "8f720002-7a5f-4a9d-9b0f-6e2d3c4b5a10";
constexpr const char* kBleEventTxUuid = "8f720003-7a5f-4a9d-9b0f-6e2d3c4b5a10";
constexpr const char* kRefreshEventJson = "{\"ev\":\"refresh\"}";

#ifndef UNIT_TEST

class BlePeripheral {
 public:
  BlePeripheral() : serverCallbacks_(*this), rxCallbacks_(*this) {}

  void begin() {
    NimBLEDevice::init(kBleDeviceName);

    server_ = NimBLEDevice::createServer();
    server_->setCallbacks(&serverCallbacks_, false);

    NimBLEService* service = server_->createService(kBleServiceUuid);
    dashboardRx_ = service->createCharacteristic(kBleDashboardRxUuid, NIMBLE_PROPERTY::WRITE);
    dashboardRx_->setCallbacks(&rxCallbacks_);

    eventTx_ = service->createCharacteristic(kBleEventTxUuid, NIMBLE_PROPERTY::NOTIFY);

    service->start();

    NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
    advertising->addServiceUUID(kBleServiceUuid);
    advertising->setScanResponse(true);
    NimBLEDevice::startAdvertising();
  }

  bool connected() const {
    return connected_;
  }

  bool payloadReady() const {
    return assembler_.complete();
  }

  bool hasPayload() const {
    return payloadReady();
  }

  const char* payload() const {
    return assembler_.payload();
  }

  void clearPayload() {
    assembler_.reset();
  }

  void reset() {
    clearPayload();
  }

  void sendRefreshEvent() {
    if (eventTx_ == nullptr || !connected_) {
      return;
    }
    eventTx_->notify(reinterpret_cast<const uint8_t*>(kRefreshEventJson), refreshEventLength());
  }

 private:
  static constexpr size_t refreshEventLength() {
    return 16;
  }

  class ServerCallbacks : public NimBLEServerCallbacks {
   public:
    explicit ServerCallbacks(BlePeripheral& peripheral) : peripheral_(peripheral) {}

    void onConnect(NimBLEServer* server) override {
      (void)server;
      peripheral_.connected_ = true;
    }

    void onDisconnect(NimBLEServer* server) override {
      (void)server;
      peripheral_.connected_ = false;
      NimBLEDevice::startAdvertising();
    }

   private:
    BlePeripheral& peripheral_;
  };

  class DashboardRxCallbacks : public NimBLECharacteristicCallbacks {
   public:
    explicit DashboardRxCallbacks(BlePeripheral& peripheral) : peripheral_(peripheral) {}

    void onWrite(NimBLECharacteristic* characteristic) override {
      const std::string value = characteristic->getValue();
      peripheral_.assembler_.accept(reinterpret_cast<const uint8_t*>(value.data()), value.size());
    }

   private:
    BlePeripheral& peripheral_;
  };

  FrameAssembler assembler_;
  volatile bool connected_ = false;
  NimBLEServer* server_ = nullptr;
  NimBLECharacteristic* dashboardRx_ = nullptr;
  NimBLECharacteristic* eventTx_ = nullptr;
  ServerCallbacks serverCallbacks_;
  DashboardRxCallbacks rxCallbacks_;
};

#endif  // UNIT_TEST

}  // namespace token_buddy
