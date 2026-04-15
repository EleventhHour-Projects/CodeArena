#include <iostream>
#include <string>
#include <vector>
#include <functional>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<string> results;

    function<void(string&, int, int)> gen = [&](string& cur, int open, int close) {
        if ((int)cur.size() == 2 * n) {
            results.push_back(cur);
            return;
        }
        if (open < n) {
            cur.push_back('(');
            gen(cur, open + 1, close);
            cur.pop_back();
        }
        if (close < open) {
            cur.push_back(')');
            gen(cur, open, close + 1);
            cur.pop_back();
        }
    };

    string cur;
    gen(cur, 0, 0);

    for (int i = 0; i < (int)results.size(); i++) {
        if (i) cout << ' ';
        cout << results[i];
    }
    cout << "\n";
    return 0;
}
