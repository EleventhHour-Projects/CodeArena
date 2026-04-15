#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    bool bulbs[101] = {};
    for (int i = 0; i < n; i++) {
        int b;
        cin >> b;
        bulbs[b] = !bulbs[b];
    }
    vector<int> on;
    for (int i = 1; i <= 100; i++) {
        if (bulbs[i]) on.push_back(i);
    }
    if (on.empty()) {
        cout << -1 << "\n";
    } else {
        for (int i = 0; i < (int)on.size(); i++) {
            if (i) cout << " ";
            cout << on[i];
        }
        cout << "\n";
    }
    return 0;
}
