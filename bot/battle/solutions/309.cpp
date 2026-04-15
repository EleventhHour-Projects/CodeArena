#include <iostream>
#include <vector>
#include <map>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    map<int, long long> freq;
    for (int i = 0; i < n; i++) {
        int d; cin >> d;
        freq[d] += d;
    }
    vector<pair<int, long long>> vals(freq.begin(), freq.end());
    int m = vals.size();
    if (m == 0) { cout << 0 << "\n"; return 0; }
    vector<long long> dp(m, 0);
    dp[0] = vals[0].second;
    for (int i = 1; i < m; i++) {
        dp[i] = vals[i].second;
        // Find the last index j where vals[j].first < vals[i].first - 2
        int best = -1;
        for (int j = i - 1; j >= 0; j--) {
            if (vals[j].first < vals[i].first - 2) {
                best = j;
                break;
            }
        }
        if (best >= 0) dp[i] += dp[best];
        dp[i] = max(dp[i], dp[i - 1]);
    }
    cout << dp[m - 1] << "\n";
    return 0;
}
