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
    sort(nums.begin(), nums.end());
    int ans = 0;
    for (int i = 0; i < n / 2; i++)
        ans = max(ans, nums[i] + nums[n - 1 - i]);
    cout << ans << "\n";
    return 0;
}
