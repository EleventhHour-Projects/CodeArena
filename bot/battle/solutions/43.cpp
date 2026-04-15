#include <iostream>
#include <string>
#include <sstream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string line;
    if (!getline(cin, line)) return 0;
    istringstream iss(line);
    string word;
    vector<string> words;
    while (iss >> word) words.push_back(word);
    int sz = words.size();
    vector<string> result(sz);
    for (auto& w : words) {
        int pos = w.back() - '1';
        result[pos] = w.substr(0, w.size() - 1);
    }
    for (int i = 0; i < sz; i++) {
        if (i > 0) cout << " ";
        cout << result[i];
    }
    cout << "\n";
    return 0;
}
