#pragma once

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

namespace token_buddy {

inline int32_t trendBarHeight(uint64_t value, uint64_t maxTotal, int32_t maxBarHeight) {
  if (value == 0 || maxTotal == 0 || maxBarHeight <= 0) {
    return 0;
  }

  uint64_t height = (value * static_cast<uint64_t>(maxBarHeight)) / maxTotal;
  if (height == 0) {
    return maxBarHeight < 3 ? maxBarHeight : 3;
  }
  if (height > static_cast<uint64_t>(maxBarHeight)) {
    return maxBarHeight;
  }
  return static_cast<int32_t>(height);
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
      {1000000000ULL, "B"},
      {1000000ULL, "M"},
      {1000ULL, "K"},
  };

  for (const Unit& unit : units) {
    if (value >= unit.threshold) {
      const double scaled = static_cast<double>(value) / static_cast<double>(unit.threshold);
      snprintf(dest, destSize, "%.1f%s", scaled, unit.suffix);
      return;
    }
  }

  snprintf(dest, destSize, "%llu", static_cast<unsigned long long>(value));
}

}  // namespace token_buddy
