#pragma once

#include <cstddef>
#include <cstdint>
#include <cstring>

namespace token_buddy {

constexpr uint8_t kFrameKindDashboard = 1;
constexpr size_t kFrameHeaderBytes = 9;
constexpr size_t kMaxFragmentBytes = 150;
constexpr size_t kMaxChunkCount = 255;
constexpr size_t kMaxPayloadBytes = kMaxFragmentBytes * kMaxChunkCount;

class FrameAssembler {
 public:
  FrameAssembler() { reset(); }

  bool accept(const uint8_t* frame, size_t len) {
    ParsedFrame parsed;
    if (!parse(frame, len, parsed)) {
      return false;
    }

    if (started_) {
      if (parsed.frameId != frameId_ || parsed.chunkCount != chunkCount_) {
        return false;
      }
    } else {
      frameId_ = parsed.frameId;
      chunkCount_ = parsed.chunkCount;
      started_ = true;
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

    parsed.frameId = frame[5];
    parsed.chunkIndex = chunkIndex;
    parsed.chunkCount = chunkCount;
    parsed.payloadLen = payloadLen;
    parsed.payload = frame + kFrameHeaderBytes;
    return true;
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

}  // namespace token_buddy
