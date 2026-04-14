#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int m, n;
    if (!(cin >> m >> n)) return 0;
    int u1, v1, u2, v2;
    if (!(cin >> u1 >> v1 >> u2 >> v2)) return 0;
    if (u1 == u2 || u1 == v2) cout << u1 << "\n";
    else cout << v1 << "\n";
    // Consume remaining edges
    for (int i = 2; i < m; i++) {
        int x, y; cin >> x >> y;
    }
    return 0;
}
