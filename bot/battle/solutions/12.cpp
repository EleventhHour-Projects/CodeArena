#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    int max_val = -1e9;
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
        if (nums[i] > max_val) max_val = nums[i];
    }
    long long moves = 0;
    for (int x : nums) {
        moves += (max_val - x);
    }
    cout << moves << "\n";
    return 0;
}
