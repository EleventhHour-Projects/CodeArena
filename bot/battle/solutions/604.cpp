#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>
#include <climits>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> houses(n);
    for (int i = 0; i < n; i++) cin >> houses[i];
    int k;
    cin >> k;
    sort(houses.begin(), houses.end());
    // cost[i][j] = cost of serving houses[i..j] with 1 mailbox (at median)
    vector<vector<int>> cost(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++)
        for (int j = i; j < n; j++) {
            int med = (i + j) / 2;
            for (int m = i; m <= j; m++)
                cost[i][j] += abs(houses[m] - houses[med]);
        }
    // dp[i][j] = min cost for first j houses using i mailboxes
    vector<vector<int>> dp(k + 1, vector<int>(n + 1, INT_MAX / 2));
    dp[0][0] = 0;
    for (int i = 1; i <= k; i++)
        for (int j = 1; j <= n; j++)
            for (int m = 0; m < j; m++)
                if (dp[i-1][m] != INT_MAX / 2)
                    dp[i][j] = min(dp[i][j], dp[i-1][m] + cost[m][j-1]);
    cout << dp[k][n] << "\n";
    return 0;
}
