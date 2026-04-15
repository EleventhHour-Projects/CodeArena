#include <iostream>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    if (n <= 3) { cout << n - 1 << "\n"; return 0; }
    long long ans = 1;
    while (n > 4) {
        ans *= 3;
        n -= 3;
    }
    ans *= n;
    cout << ans << "\n";
    return 0;
}
