#pragma once
#include <stdint.h>

namespace token_buddy {

enum class TouchAction : uint8_t {
  None = 0,
  Previous = 1,
  Refresh = 2,
  Next = 3,
};

inline TouchAction classifyButtonTouch(bool btnA, bool btnB, bool btnC) {
  if (btnB) {
    return TouchAction::Refresh;
  }
  if (btnA) {
    return TouchAction::Previous;
  }
  if (btnC) {
    return TouchAction::Next;
  }
  return TouchAction::None;
}

inline TouchAction classifyTouch(int32_t x, int32_t y) {
  constexpr int32_t kDisplayWidth = 320;
  constexpr int32_t kDisplayHeight = 240;
  constexpr int32_t kActivationY = 200;
  constexpr int32_t kLeftBoundary = kDisplayWidth / 3;
  constexpr int32_t kRightBoundary = (kDisplayWidth * 2) / 3;

  if (x < 0 || x >= kDisplayWidth || y < kActivationY || y >= kDisplayHeight) {
    return TouchAction::None;
  }
  if (x < kLeftBoundary) {
    return TouchAction::Previous;
  }
  if (x < kRightBoundary) {
    return TouchAction::Refresh;
  }
  return TouchAction::Next;
}

}  // namespace token_buddy
