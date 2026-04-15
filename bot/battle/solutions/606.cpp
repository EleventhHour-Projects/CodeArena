#include <iostream>
#include <string>
#include <algorithm>
#include <cmath>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    long long x;
    if (!(cin >> x)) return 0;
    bool neg = x < 0;
    string s = to_string(abs(x));
    reverse(s.begin(), s.end());
    long long result = 0;
    for (char c : s) result = result * 10 + (c - '0');
    if (neg) result = -result;
    if (result < -(1LL << 31) || result > (1LL << 31) - 1) result = 0;
    cout << result << "\n";
    return 0;
}
