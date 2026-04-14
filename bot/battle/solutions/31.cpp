#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> record;
    for (int i = 0; i < n; i++) {
        string op; cin >> op;
        if (op == "+") {
            record.push_back(record[record.size() - 1] + record[record.size() - 2]);
        } else if (op == "D") {
            record.push_back(record.back() * 2);
        } else if (op == "C") {
            record.pop_back();
        } else {
            record.push_back(stoi(op));
        }
    }
    long long total = 0;
    for (int x : record) total += x;
    cout << total << "\n";
    return 0;
}
