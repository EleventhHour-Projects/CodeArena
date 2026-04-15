#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> piles(n);
    for (int i = 0; i < n; i++) cin >> piles[i];
    sort(piles.begin(), piles.end());
    long long ans = 0;
    for (int i = n / 3; i < n; i += 2)
        ans += piles[i];
    cout << ans << "\n";
    return 0;
}
