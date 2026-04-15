#include <iostream>
#include <vector>
#include <queue>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<vector<int>> rooms(n);
    for (int i = 0; i < n; i++) {
        int k;
        cin >> k;
        rooms[i].resize(k);
        for (int j = 0; j < k; j++) cin >> rooms[i][j];
    }
    vector<bool> visited(n, false);
    queue<int> q;
    q.push(0);
    visited[0] = true;
    int cnt = 1;
    while (!q.empty()) {
        int room = q.front(); q.pop();
        for (int key : rooms[room]) {
            if (!visited[key]) {
                visited[key] = true;
                cnt++;
                q.push(key);
            }
        }
    }
    cout << (cnt == n ? "true" : "false") << "\n";
    return 0;
}
