#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<string> words(n);
    for (int i = 0; i < n; i++) cin >> words[i];
    map<string, vector<string>> groups;
    vector<string> order;
    for (int i = 0; i < n; i++) {
        string key = words[i];
        sort(key.begin(), key.end());
        if (groups.find(key) == groups.end())
            order.push_back(key);
        groups[key].push_back(words[i]);
    }
    for (auto& key : order) {
        sort(groups[key].begin(), groups[key].end());
        for (int j = 0; j < (int)groups[key].size(); j++) {
            if (j) cout << " ";
            cout << groups[key][j];
        }
        cout << "\n";
    }
    return 0;
}
