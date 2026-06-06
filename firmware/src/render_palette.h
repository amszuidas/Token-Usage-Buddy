#pragma once

#include <stddef.h>
#include <stdint.h>

namespace token_buddy {

constexpr uint16_t kColorText = 0xFFFF;
constexpr uint16_t kColorAccent = 0x05FF;

constexpr uint16_t kBreakdownInput = 0x3C1E;
constexpr uint16_t kBreakdownCacheCreate = 0xFD24;
constexpr uint16_t kBreakdownCacheRead = 0xA3DE;
constexpr uint16_t kBreakdownOutput = 0x264B;

inline uint16_t todayTokenValueColor() {
  return kColorAccent;
}

inline uint16_t todayCostValueColor() {
  return kColorText;
}

inline uint16_t breakdownColor(size_t index) {
  static constexpr uint16_t colors[4] = {
      kBreakdownInput,
      kBreakdownCacheCreate,
      kBreakdownCacheRead,
      kBreakdownOutput,
  };
  return index < 4 ? colors[index] : kColorAccent;
}

}  // namespace token_buddy
