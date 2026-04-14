#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int m, n;
    if (!(cin >> m >> n)) return 0;
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            int x; cin >> x;
            if (i == j || i + j == n - 1) sum += x;
        }
    }
    cout << sum << "\n";
    return 0;
}
