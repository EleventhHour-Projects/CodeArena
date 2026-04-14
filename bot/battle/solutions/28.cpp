#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<string> names(n);
    for (int i = 0; i < n; i++) cin >> names[i];
    int k; cin >> k;
    vector<pair<int, string>> people(n);
    for (int i = 0; i < n; i++) {
        int h; cin >> h;
        people[i] = {h, names[i]};
    }
    sort(people.rbegin(), people.rend());
    for (int i = 0; i < n; i++) {
        cout << people[i].second << (i == n - 1 ? "" : " ");
    }
    cout << "\n";
    return 0;
}
