#pragma once

namespace token_buddy {

inline const char* freshnessLabel(bool stale) {
  return stale ? "Stale" : "Current";
}

}  // namespace token_buddy
