#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    sort(a.begin(), a.end(), greater<int>());
    for (int i = 0; i + 2 < n; i++) {
        if (a[i] < a[i+1] + a[i+2]) {
            cout << a[i] + a[i+1] + a[i+2] << "\n";
            return 0;
        }
    }
    cout << 0 << "\n";
    return 0;
}
