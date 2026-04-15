#include <iostream>
#include <vector>
#include <algorithm>
#include <map>
#include <sstream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, m;
    if (!(cin >> n >> m)) return 0;
    string line;
    getline(cin, line); // consume rest of first line
    map<int, int> freq;
    for (int i = 0; i < n; i++) {
        getline(cin, line);
        istringstream iss(line);
        int x;
        while (iss >> x) {
            freq[x]++;
        }
    }
    vector<int> result;
    for (auto& p : freq) {
        if (p.second == n) result.push_back(p.first);
    }
    if (result.empty()) {
        cout << "-1\n";
    } else {
        for (int i = 0; i < (int)result.size(); i++) {
            if (i > 0) cout << " ";
            cout << result[i];
        }
        cout << "\n";
    }
    return 0;
}
