#pragma once

#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstring>

#include <ArduinoJson.h>

#include "dashboard_model.h"

namespace token_buddy {

constexpr uint8_t kFrameKindDashboard = 1;
constexpr size_t kFrameHeaderBytes = 9;
constexpr size_t kMaxFragmentBytes = 150;
constexpr size_t kMaxChunkCount = 255;
constexpr size_t kMaxPayloadBytes = kMaxFragmentBytes * kMaxChunkCount;

struct DashboardJsonParseResult {
  bool ok = false;
  bool refreshInProgress = false;
};

inline uint16_t rgb565(uint8_t r, uint8_t g, uint8_t b) {
  return static_cast<uint16_t>(((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3));
}

inline void copyField(char* dest, size_t destSize, const char* value) {
  if (dest == nullptr || destSize == 0) {
    return;
  }
  if (value == nullptr) {
    dest[0] = '\0';
    return;
  }
  snprintf(dest, destSize, "%s", value);
}

inline bool isDigit(char value) {
  return value >= '0' && value <= '9';
}

inline const char* findDisplayTime(const char* value) {
  if (value == nullptr) {
    return nullptr;
  }

  for (const char* cursor = value; *cursor != '\0'; ++cursor) {
    if (*cursor != 'T' && *cursor != ' ') {
      continue;
    }
    const char* time = cursor + 1;
    size_t remaining = 0;
    while (remaining < 5 && time[remaining] != '\0') {
      remaining += 1;
    }
    if (remaining == 5 && isDigit(time[0]) && isDigit(time[1]) && time[2] == ':' &&
        isDigit(time[3]) && isDigit(time[4])) {
      return time;
    }
  }
  return nullptr;
}

inline void copyDisplayTimeOrText(char* dest, size_t destSize, const char* value) {
  if (dest == nullptr || destSize == 0) {
    return;
  }
  if (value == nullptr) {
    dest[0] = '\0';
    return;
  }

  const char* time = findDisplayTime(value);
  if (time != nullptr && destSize >= 6) {
    snprintf(dest, destSize, "%.5s", time);
    return;
  }

  const size_t len = strlen(value);
  if (len < destSize) {
    snprintf(dest, destSize, "%s", value);
    return;
  }

  if (destSize <= 4) {
    snprintf(dest, destSize, "%s", value);
    return;
  }
  const size_t prefixLen = destSize - 4;
  snprintf(dest, destSize, "%.*s...", static_cast<int>(prefixLen), value);
}

inline uint64_t asUint64(JsonVariantConst value) {
  if (value.isNull()) {
    return 0;
  }
  return value.as<uint64_t>();
}

inline uint32_t asUint32(JsonVariantConst value) {
  const uint64_t raw = asUint64(value);
  return raw > UINT32_MAX ? UINT32_MAX : static_cast<uint32_t>(raw);
}

inline void formatTokenLabel(uint64_t value, char* dest, size_t destSize) {
  if (dest == nullptr || destSize == 0) {
    return;
  }

  struct Unit {
    uint64_t threshold;
    const char* suffix;
  };
  static constexpr Unit units[] = {
      {1000000000000ULL, "T"},
      {1000000000UL, "B"},
      {1000000UL, "M"},
      {1000UL, "K"},
  };

  for (const Unit& unit : units) {
    if (value >= unit.threshold) {
      const double scaled = static_cast<double>(value) / static_cast<double>(unit.threshold);
      if (scaled >= 100.0 || (static_cast<uint64_t>(scaled * 10.0) % 10ULL) == 0ULL) {
        snprintf(dest, destSize, "%.0f%s", scaled, unit.suffix);
      } else if (scaled >= 10.0) {
        snprintf(dest, destSize, "%.0f%s", scaled, unit.suffix);
      } else {
        snprintf(dest, destSize, "%.1f%s", scaled, unit.suffix);
      }
      return;
    }
  }

  snprintf(dest, destSize, "%llu", static_cast<unsigned long long>(value));
}

inline uint16_t agentColor(const char* id, const char* label, size_t index) {
  if ((id != nullptr && strcmp(id, "claude") == 0) ||
      (id == nullptr && label != nullptr && strcmp(label, "Claude") == 0) ||
      (id == nullptr && label == nullptr && index == 0)) {
    return rgb565(0xD9, 0x77, 0x57);
  }
  if ((id != nullptr && strcmp(id, "codex") == 0) ||
      (id == nullptr && label != nullptr && strcmp(label, "Codex") == 0) ||
      (id == nullptr && label == nullptr && index == 1)) {
    return rgb565(0x10, 0xA3, 0x7F);
  }
  if ((id != nullptr && strcmp(id, "opencode") == 0) ||
      (id == nullptr && label != nullptr && strcmp(label, "OpenCode") == 0) ||
      (id == nullptr && label == nullptr && index == 2)) {
    return rgb565(0x03, 0xB0, 0x00);
  }
  return rgb565(0x8E, 0x8E, 0xA0);
}

inline DashboardJsonParseResult parseDashboardJson(const char* json, DashboardData& data) {
  DashboardJsonParseResult result;
  if (json == nullptr) {
    return result;
  }

  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, json);
  if (error) {
    return result;
  }

  JsonObjectConst root = doc.as<JsonObjectConst>();
  if (root.isNull()) {
    return result;
  }

  JsonVariantConst schemaVersion = root["schemaVersion"];
  if (!schemaVersion.isNull() && schemaVersion.as<int>() != 1) {
    return result;
  }

  DashboardData next = data;
  result.refreshInProgress = root["refreshInProgress"] | false;

  if (root["stale"].is<bool>()) {
    next.stale = root["stale"].as<bool>();
  }
  copyField(next.error, sizeof(next.error), root["error"].is<const char*>() ? root["error"].as<const char*>() : "");
  if (root["generatedAt"].is<const char*>()) {
    copyDisplayTimeOrText(next.updatedAt, sizeof(next.updatedAt), root["generatedAt"].as<const char*>());
  }
  if (root["ccusageVersion"].is<const char*>()) {
    copyField(next.ccusageVersion, sizeof(next.ccusageVersion), root["ccusageVersion"].as<const char*>());
  }
  copyDisplayTimeOrText(next.nextRefresh, sizeof(next.nextRefresh),
                        root["nextRefreshAt"].is<const char*>() ? root["nextRefreshAt"].as<const char*>() : "");

  JsonObjectConst today = root["today"].as<JsonObjectConst>();
  if (!today.isNull()) {
    if (today["totalTokensLabel"].is<const char*>()) {
      copyField(next.todayTotal, sizeof(next.todayTotal), today["totalTokensLabel"].as<const char*>());
    } else if (!today["totalTokens"].isNull()) {
      formatTokenLabel(asUint64(today["totalTokens"]), next.todayTotal, sizeof(next.todayTotal));
    }

    if (today["costLabel"].is<const char*>()) {
      copyField(next.cost, sizeof(next.cost), today["costLabel"].as<const char*>());
    } else if (!today["costUsd"].isNull()) {
      snprintf(next.cost, sizeof(next.cost), "$%.2f", today["costUsd"].as<double>());
    }

    JsonObjectConst breakdown = today["breakdown"].as<JsonObjectConst>();
    if (!breakdown.isNull()) {
      next.breakdown[0] = asUint32(breakdown["input"]);
      next.breakdown[1] = asUint32(breakdown["cacheCreate"]);
      next.breakdown[2] = asUint32(breakdown["cacheRead"]);
      next.breakdown[3] = asUint32(breakdown["output"]);
    }

    JsonArrayConst agents = today["agents"].as<JsonArrayConst>();
    if (!agents.isNull()) {
      for (size_t i = 0; i < 4; ++i) {
        next.agents[i] = AgentRow{};
      }
      size_t index = 0;
      for (JsonObjectConst agent : agents) {
        if (index >= 4) {
          break;
        }
        const char* label = agent["label"].is<const char*>() ? agent["label"].as<const char*>() : "";
        const char* id = agent["id"].is<const char*>() ? agent["id"].as<const char*>() : nullptr;
        copyField(next.agents[index].label, sizeof(next.agents[index].label), label);
        formatTokenLabel(asUint64(agent["totalTokens"]), next.agents[index].value,
                         sizeof(next.agents[index].value));
        next.agents[index].percent = agent["percent"] | 0.0f;
        next.agents[index].color565 = agentColor(id, label[0] ? label : nullptr, index);
        index += 1;
      }
    }
  }

  JsonArrayConst sevenDays = root["sevenDays"].as<JsonArrayConst>();
  if (!sevenDays.isNull()) {
    for (size_t i = 0; i < 7; ++i) {
      next.sevenDayTotals[i] = 0;
    }
    size_t index = 0;
    for (JsonObjectConst day : sevenDays) {
      if (index >= 7) {
        break;
      }
      next.sevenDayTotals[index] = asUint32(day["totalTokens"]);
      index += 1;
    }
  }

  data = next;
  result.ok = true;
  return result;
}

class FrameAssembler {
 public:
  FrameAssembler() { reset(); }

  bool accept(const uint8_t* frame, size_t len) {
    ParsedFrame parsed;
    if (!parse(frame, len, parsed)) {
      return false;
    }

    if (started_ && parsed.frameId != frameId_) {
      startSequence(parsed.frameId, parsed.chunkCount);
    } else if (started_) {
      if (parsed.chunkCount != chunkCount_) {
        return false;
      }
    } else {
      startSequence(parsed.frameId, parsed.chunkCount);
    }

    if (seen_[parsed.chunkIndex]) {
      return false;
    }
    if (totalPayloadBytes_ + parsed.payloadLen > kMaxPayloadBytes) {
      return false;
    }

    std::memcpy(payload_ + (parsed.chunkIndex * kMaxFragmentBytes), parsed.payload, parsed.payloadLen);
    chunkLengths_[parsed.chunkIndex] = parsed.payloadLen;
    seen_[parsed.chunkIndex] = true;
    totalPayloadBytes_ += parsed.payloadLen;
    receivedChunks_ += 1;

    if (receivedChunks_ == chunkCount_) {
      return finalizePayload();
    }

    complete_ = false;
    return true;
  }

  bool complete() const {
    return complete_;
  }

  const char* payload() const {
    return payload_;
  }

  void reset() {
    started_ = false;
    complete_ = false;
    frameId_ = 0;
    chunkCount_ = 0;
    receivedChunks_ = 0;
    totalPayloadBytes_ = 0;
    payload_[0] = '\0';
    for (size_t i = 0; i < kMaxChunkCount; ++i) {
      seen_[i] = false;
      chunkLengths_[i] = 0;
    }
  }

 private:
  struct ParsedFrame {
    uint8_t frameId = 0;
    uint8_t chunkIndex = 0;
    uint8_t chunkCount = 0;
    uint8_t payloadLen = 0;
    const uint8_t* payload = nullptr;
  };

  bool parse(const uint8_t* frame, size_t len, ParsedFrame& parsed) const {
    if (frame == nullptr || len < kFrameHeaderBytes) {
      return false;
    }
    if (frame[0] != 'T' || frame[1] != 'U' || frame[2] != 'B' || frame[3] != '1') {
      return false;
    }
    if (frame[4] != kFrameKindDashboard) {
      return false;
    }

    const uint8_t payloadLen = frame[8];
    if (len != kFrameHeaderBytes + payloadLen) {
      return false;
    }
    if (payloadLen > kMaxFragmentBytes) {
      return false;
    }

    const uint8_t chunkIndex = frame[6];
    const uint8_t chunkCount = frame[7];
    if (chunkCount == 0 || chunkIndex >= chunkCount) {
      return false;
    }

    const uint8_t frameId = frame[5];
    if (frameId == 0) {
      return false;
    }

    parsed.frameId = frameId;
    parsed.chunkIndex = chunkIndex;
    parsed.chunkCount = chunkCount;
    parsed.payloadLen = payloadLen;
    parsed.payload = frame + kFrameHeaderBytes;
    return true;
  }

  void startSequence(uint8_t frameId, uint8_t chunkCount) {
    started_ = true;
    complete_ = false;
    frameId_ = frameId;
    chunkCount_ = chunkCount;
    receivedChunks_ = 0;
    totalPayloadBytes_ = 0;
    payload_[0] = '\0';
    for (size_t i = 0; i < kMaxChunkCount; ++i) {
      seen_[i] = false;
      chunkLengths_[i] = 0;
    }
  }

  bool finalizePayload() {
    size_t writeOffset = 0;
    for (size_t i = 0; i < chunkCount_; ++i) {
      if (!seen_[i]) {
        complete_ = false;
        payload_[0] = '\0';
        return false;
      }
      if (writeOffset + chunkLengths_[i] > kMaxPayloadBytes) {
        complete_ = false;
        payload_[0] = '\0';
        return false;
      }
      std::memmove(payload_ + writeOffset, payload_ + (i * kMaxFragmentBytes), chunkLengths_[i]);
      writeOffset += chunkLengths_[i];
    }

    payload_[writeOffset] = '\0';
    complete_ = true;
    return true;
  }

  bool started_ = false;
  bool complete_ = false;
  uint8_t frameId_ = 0;
  uint8_t chunkCount_ = 0;
  uint8_t receivedChunks_ = 0;
  size_t totalPayloadBytes_ = 0;
  bool seen_[kMaxChunkCount] = {};
  size_t chunkLengths_[kMaxChunkCount] = {};
  char payload_[kMaxPayloadBytes + 1] = {};
};

#ifdef UNIT_TEST
inline size_t buildTestFrame(
    uint8_t* out,
    size_t capacity,
    uint8_t frameId,
    uint8_t chunkIndex,
    uint8_t chunkCount,
    const char* payload,
    size_t payloadLen) {
  if (out == nullptr || payload == nullptr || payloadLen > kMaxFragmentBytes) {
    return 0;
  }
  if (capacity < kFrameHeaderBytes + payloadLen) {
    return 0;
  }
  if (chunkCount == 0 || chunkIndex >= chunkCount) {
    return 0;
  }

  out[0] = 'T';
  out[1] = 'U';
  out[2] = 'B';
  out[3] = '1';
  out[4] = kFrameKindDashboard;
  out[5] = frameId;
  out[6] = chunkIndex;
  out[7] = chunkCount;
  out[8] = static_cast<uint8_t>(payloadLen);
  std::memcpy(out + kFrameHeaderBytes, payload, payloadLen);

  return kFrameHeaderBytes + payloadLen;
}
#endif

}  // namespace token_buddy
