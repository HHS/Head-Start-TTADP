require "yaml"
require "erb"
require "active_support/core_ext/hash"

class Config
  CONFIG_FILE = File.expand_path(File.join(__dir__, "..", "smartsheet.yml")).freeze

  def self.load
    @config ||= yaml.with_indifferent_access[:regions]
  end

  private

  def self.yaml
    @yaml ||= YAML.load(ERB.new(File.read(CONFIG_FILE)).result)
  end
end
