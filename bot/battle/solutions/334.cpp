#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    int k;
    cin >> k;
    sort(h.rbegin(), h.rend());
    long long ans = 0;
    for (int i = 0; i < k; i++)
        ans += max(0LL, h[i] - i);
    cout << ans << "\n";
    return 0;
}
