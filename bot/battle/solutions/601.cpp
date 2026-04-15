#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> sat(n);
    for (int i = 0; i < n; i++) cin >> sat[i];
    sort(sat.begin(), sat.end());
    long long total = 0, suffix = 0;
    for (int i = n - 1; i >= 0; i--) {
        suffix += sat[i];
        if (suffix <= 0) break;
        total += suffix;
    }
    cout << total << "\n";
    return 0;
}
