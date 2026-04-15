#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    vector<int> peaks;
    for (int i = 1; i < n - 1; i++) {
        if (a[i] > a[i - 1] && a[i] > a[i + 1])
            peaks.push_back(i);
    }
    if (peaks.empty()) {
        cout << -1 << "\n";
    } else {
        for (int i = 0; i < (int)peaks.size(); i++) {
            if (i) cout << " ";
            cout << peaks[i];
        }
        cout << "\n";
    }
    return 0;
}
