#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int maxBit;
    cin >> maxBit;
    int mask = (1 << maxBit) - 1;
    int xorSum = 0;
    for (int x : nums) xorSum ^= x;
    for (int i = 0; i < n; i++) {
        if (i) cout << ' ';
        cout << (xorSum ^ mask);
        xorSum ^= nums[n - 1 - i];
    }
    cout << "\n";
    return 0;
}
