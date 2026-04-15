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
    for (int i = 0; i < n; i++) cin >> nums[i];
    vector<int> sorted_nums(nums);
    sort(sorted_nums.begin(), sorted_nums.end());
    // For each divisor k of n, check if rotating chunks of size k can sort
    long long ans = 0;
    auto getDivisors = [&]() {
        vector<int> divs;
        for (int i = 1; i <= n; i++)
            if (n % i == 0) divs.push_back(i);
        return divs;
    };
    for (int k : getDivisors()) {
        bool valid = true;
        for (int start = 0; start < n && valid; start += k) {
            // Check if chunk nums[start..start+k-1] can be rotated to match sorted[start..start+k-1]
            bool found = false;
            for (int r = 0; r < k && !found; r++) {
                bool match = true;
                for (int j = 0; j < k && match; j++)
                    if (nums[start + (j + r) % k] != sorted_nums[start + j])
                        match = false;
                if (match) found = true;
            }
            if (!found) valid = false;
        }
        if (valid) ans += k;
    }
    cout << ans << "\n";
    return 0;
}
