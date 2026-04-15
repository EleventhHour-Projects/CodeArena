#include <iostream>
#include <string>
#include <vector>
#include <functional>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    int n = s.size();
    vector<string> results;
    string cur = s;

    function<void(int)> bt = [&](int i) {
        if (i == n) {
            results.push_back(cur);
            return;
        }
        if (isalpha(s[i])) {
            cur[i] = tolower(s[i]);
            bt(i + 1);
            cur[i] = toupper(s[i]);
            bt(i + 1);
        } else {
            bt(i + 1);
        }
    };
    bt(0);

    for (int i = 0; i < (int)results.size(); i++) {
        if (i) cout << ' ';
        cout << results[i];
    }
    cout << "\n";
    return 0;
}
