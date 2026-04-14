#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    int min_val = 1e9, max_val = -1e9;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        min_val = min(min_val, x);
        max_val = max(max_val, x);
    }
    int k; cin >> k;
    cout << max(0, (max_val - k) - (min_val + k)) << "\n";
    return 0;
}
