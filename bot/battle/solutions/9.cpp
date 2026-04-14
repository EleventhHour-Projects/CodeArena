#include <iostream>
#include <vector>
#include <unordered_set>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    unordered_set<int> types;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        types.insert(x);
    }
    cout << min((int)types.size(), n / 2) << "\n";
    return 0;
}
