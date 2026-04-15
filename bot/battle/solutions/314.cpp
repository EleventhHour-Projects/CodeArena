#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, delay, forget;
    if (!(cin >> n)) return 0;
    cin >> delay >> forget;
    const int MOD = 1e9 + 7;
    vector<long long> nw(n + 1, 0);
    nw[1] = 1;
    long long sharing = 0;
    for (int d = 2; d <= n; d++) {
        if (d - delay >= 1) sharing = (sharing + nw[d - delay]) % MOD;
        if (d - forget >= 1) sharing = (sharing - nw[d - forget] + MOD) % MOD;
        nw[d] = sharing;
    }
    long long ans = 0;
    for (int d = 1; d <= n; d++)
        if (d + forget > n)
            ans = (ans + nw[d]) % MOD;
    cout << ans << "\n";
    return 0;
}
