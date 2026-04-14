#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    long long current = 0;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        current += x;
        cout << current << (i == n - 1 ? "" : " ");
    }
    cout << "\n";
    return 0;
}
