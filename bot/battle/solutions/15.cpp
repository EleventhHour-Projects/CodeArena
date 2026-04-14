#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    if (n == 0) { cout << 0 << "\n"; return 0; }
    if (n == 1 || n == 2) { cout << 1 << "\n"; return 0; }
    vector<long long> t(max(3, n + 1));
    t[0] = 0; t[1] = 1; t[2] = 1;
    for (int i = 3; i <= n; i++) {
        t[i] = t[i - 1] + t[i - 2] + t[i - 3];
    }
    cout << t[n] << "\n";
    return 0;
}
